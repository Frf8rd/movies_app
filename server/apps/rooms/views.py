from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django.conf import settings

from apps.core.exceptions import ApiError, Conflict
from apps.core.permissions import IsUserOrGuest, is_registered
from apps.library.models import WatchedMovie
from apps.movies.models import Movie
from apps.movies.serializers import MovieSummarySerializer, with_card_relations

from . import serializers as s
from .authentication import issue_guest_token
from .models import Room, RoomMember, RoomMovie, Vote
from .permissions import get_room_as_member, require_host
from .services.deck_builder import build_deck
from .services.matching import compute_results
from .services.progress import maybe_finish_room, refresh_member_finished
from .services.room_code import generate_room_code, normalize_code


def _detail(room: Room, member: RoomMember | None):
    room = (
        Room.objects.select_related("host", "picked_movie")
        .prefetch_related("genres", "providers", "members", "picked_movie__genres", "picked_movie__providers__provider")
        .get(pk=room.pk)
    )
    return s.RoomDetailSerializer(room, context={"member": member, "country": _host_country(room)}).data


def _host_country(room: Room) -> str:
    prefs = getattr(room.host, "preferences", None)
    return prefs.country if prefs else settings.DEFAULT_COUNTRY


class RoomListCreateView(generics.GenericAPIView):
    """GET /rooms?status=active|closed|LOBBY|VOTING|RESULTS|CLOSED · POST /rooms"""

    serializer_class = s.RoomCreateSerializer

    def get(self, request):
        qs = Room.objects.filter(members__user=request.user).annotate(member_count=Count("members", distinct=True))
        st = (request.query_params.get("status") or "").strip()
        if st.lower() == "active":
            qs = qs.exclude(status=Room.Status.CLOSED)
        elif st.lower() == "closed":
            qs = qs.filter(status=Room.Status.CLOSED)
        elif st.upper() in Room.Status.values:
            qs = qs.filter(status=st.upper())
        return Response(s.RoomListSerializer(qs.order_by("-created_at"), many=True, context={"request": request}).data)

    @transaction.atomic
    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        room = Room.objects.create(
            code=generate_room_code(),
            title=d["title"].strip(),
            host=request.user,
            max_runtime=d.get("max_runtime"),
            year_from=d.get("year_from"),
            min_rating=d.get("min_rating"),
            source_list_id=d.get("source_list_id"),
            deck_size=d["deck_size"],
        )
        room.genres.set(d["genre_ids"])
        room.providers.set(d["provider_ids"])
        member = RoomMember.objects.create(room=room, user=request.user, nickname=request.user.display_name)
        return Response(_detail(room, member), status=status.HTTP_201_CREATED)


class RoomJoinView(generics.GenericAPIView):
    """
    POST /rooms/join `{ code, nickname? }`.
    Cu cont: te adaugă ca participant. Fără cont: `nickname` e obligatoriu și primești `guestToken`.
    """

    permission_classes = [AllowAny]
    serializer_class = s.JoinSerializer
    throttle_scope = "join"

    @transaction.atomic
    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = normalize_code(ser.validated_data["code"])
        room = Room.objects.select_for_update().filter(code=code).first()
        if room is None:
            raise ApiError(404, "ROOM_NOT_FOUND", "Nu există nicio cameră cu acest cod.")

        registered = is_registered(request.user)
        nickname = (ser.validated_data.get("nickname") or "").strip()

        if registered:
            existing = RoomMember.objects.filter(room=room, user=request.user).first()
            if existing:  # reintrare: idempotent
                return Response({"room": _detail(room, existing), "member": s.MemberSerializer(existing).data})
            nickname = nickname or request.user.display_name
        elif len(nickname) < 2:
            raise ApiError(400, "NICKNAME_REQUIRED", "Alege o poreclă (minim 2 caractere).")

        if room.status != Room.Status.LOBBY:
            raise Conflict("ROOM_STARTED", "Votul a început deja; nu te mai poți alătura.")
        if room.members.count() >= settings.ROOM_MAX_MEMBERS:
            raise Conflict("ROOM_FULL", "Camera este plină.")
        if room.members.filter(nickname__iexact=nickname).exists():
            raise Conflict("NICKNAME_TAKEN", "Porecla este deja folosită în această cameră.")

        member = RoomMember.objects.create(
            room=room, user=request.user if registered else None, nickname=nickname, is_guest=not registered
        )
        body = {"room": _detail(room, member), "member": s.MemberSerializer(member).data}
        if not registered:
            body["guest_token"] = issue_guest_token(member)
        return Response(body, status=status.HTTP_201_CREATED)


class RoomDetailView(generics.GenericAPIView):
    """GET /rooms/:id (și pentru invitați) · DELETE /rooms/:id (doar gazda)"""

    permission_classes = [IsUserOrGuest]
    serializer_class = s.RoomDetailSerializer

    def get(self, request, pk):
        room, member = get_room_as_member(request, pk)
        return Response(_detail(room, member))

    def delete(self, request, pk):
        room, member = get_room_as_member(request, pk)
        require_host(room, member)
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomLeaveView(generics.GenericAPIView):
    permission_classes = [IsUserOrGuest]
    serializer_class = s.RoomDetailSerializer

    @transaction.atomic
    def delete(self, request, pk):
        room, member = get_room_as_member(request, pk, lock=True)
        if member.user_id is not None and member.user_id == room.host_id:
            raise Conflict("HOST_CANNOT_LEAVE", "Gazda nu poate părăsi camera; o poate șterge.")
        member.delete()
        maybe_finish_room(room)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomStartView(generics.GenericAPIView):
    """Doar gazda: construiește pachetul de filme și pornește votul."""

    serializer_class = s.RoomDetailSerializer

    @transaction.atomic
    def post(self, request, pk):
        room, member = get_room_as_member(request, pk, lock=True)
        require_host(room, member)
        if room.status != Room.Status.LOBBY:
            raise Conflict("ALREADY_STARTED", "Votul a început deja.")
        build_deck(room)  # 422 dacă filtrele sunt prea stricte
        room.status = Room.Status.VOTING
        room.save(update_fields=["status"])
        return Response(_detail(room, member))


class RoomDeckView(generics.GenericAPIView):
    """Filmele de votat. Conține doar propriile mele voturi, niciodată ale altora."""

    permission_classes = [IsUserOrGuest]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, pk):
        room, member = get_room_as_member(request, pk)
        if room.status == Room.Status.LOBBY:
            raise Conflict("NOT_STARTED", "Votul nu a început încă.")
        mine = dict(Vote.objects.filter(member=member).values_list("movie_id", "choice"))
        items = RoomMovie.objects.filter(room=room).select_related("movie").prefetch_related(
            "movie__genres", "movie__providers__provider"
        )
        ctx = {"country": _host_country(room)}
        deck = []
        for rm in items:
            choice = mine.get(rm.movie_id)
            deck.append(
                {
                    "position": rm.position,
                    "voted": choice is not None,
                    "my_choice": Vote.Choice(choice).name if choice is not None else None,
                    "movie": MovieSummarySerializer(rm.movie, context=ctx).data,
                }
            )
        return Response(
            {"room_status": room.status, "total": len(deck), "voted_count": len(mine), "veto_used": member.veto_used, "deck": deck}
        )


class VoteCreateView(generics.GenericAPIView):
    """POST /rooms/:id/votes `{ movieId, choice: LIKE|DISLIKE|SUPER|VETO }` — 409 dacă ai votat deja."""

    permission_classes = [IsUserOrGuest]
    serializer_class = s.VoteInputSerializer

    @transaction.atomic
    def post(self, request, pk):
        room, member = get_room_as_member(request, pk, lock=True)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        movie_id, choice = ser.validated_data["movie_id"], Vote.Choice[ser.validated_data["choice"]]

        if room.status != Room.Status.VOTING:
            raise Conflict("NOT_VOTING", "Votul nu este deschis în această cameră.")
        if not RoomMovie.objects.filter(room=room, movie_id=movie_id).exists():
            raise ApiError(404, "MOVIE_NOT_IN_DECK", "Filmul nu face parte din pachetul camerei.")
        if Vote.objects.filter(member=member, movie_id=movie_id).exists():
            raise Conflict("ALREADY_VOTED", "Ai votat deja acest film.")
        if choice == Vote.Choice.VETO and member.veto_used:
            raise Conflict("VETO_USED", "Ți-ai folosit deja veto-ul în această cameră.")

        try:
            with transaction.atomic():
                Vote.objects.create(room=room, member=member, movie_id=movie_id, choice=choice)
        except IntegrityError:
            raise Conflict("ALREADY_VOTED", "Ai votat deja acest film.")
        if choice == Vote.Choice.VETO:
            member.veto_used = True
            member.save(update_fields=["veto_used"])

        finished = refresh_member_finished(member)
        maybe_finish_room(room)
        return Response(
            {"movie_id": movie_id, "choice": choice.name, "finished": finished, "room_status": room.status},
            status=status.HTTP_201_CREATED,
        )


class RoomProgressView(generics.GenericAPIView):
    """Cine a terminat de votat — fără voturi."""

    permission_classes = [IsUserOrGuest]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, pk):
        room, member = get_room_as_member(request, pk)
        members = list(room.members.all())
        return Response(
            {
                "room_status": room.status,
                "total": room.deck.count(),
                "my_voted_count": member.votes.count(),
                "finished_count": sum(m.finished_voting for m in members),
                "members": [{"nickname": m.nickname, "finished": m.finished_voting} for m in members],
            }
        )


class RoomResultsView(generics.GenericAPIView):
    """
    Disponibil doar când camera e în RESULTS (sau CLOSED, după alegere).
    Răspunsul NU spune cine a votat ce.
    """

    permission_classes = [IsUserOrGuest]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request, pk):
        room, member = get_room_as_member(request, pk)
        if room.status not in (Room.Status.RESULTS, Room.Status.CLOSED):
            raise ApiError(403, "RESULTS_NOT_READY", "Rezultatele sunt disponibile după ce se încheie votul.")

        deck = list(RoomMovie.objects.filter(room=room).select_related("movie"))
        votes: dict[int, list[int]] = {}
        for movie_id, choice in Vote.objects.filter(room=room).values_list("movie_id", "choice"):
            votes.setdefault(movie_id, []).append(choice)

        out = compute_results([(rm.movie_id, rm.movie.rating) for rm in deck], room.members.count(), votes)
        movies = {
            m.id: m
            for m in with_card_relations(Movie.objects.filter(id__in=[rm.movie_id for rm in deck]))
        }
        ctx = {"country": _host_country(room)}

        def render(items):
            return [
                {
                    "movie": MovieSummarySerializer(movies[i.movie_id], context=ctx).data,
                    "score": i.score,
                    "likes": i.likes,
                    "supers": i.supers,
                    "dislikes": i.dislikes,
                }
                for i in items
            ]

        picked = MovieSummarySerializer(room.picked_movie, context=ctx).data if room.picked_movie_id else None
        return Response(
            {
                "room_status": room.status,
                "member_count": room.members.count(),
                "has_unanimous": bool(out["unanimous"]),
                "unanimous": render(out["unanimous"]),
                "closest": render(out["closest"]),
                "picked_movie": picked,
            }
        )


class RoomCloseVotingView(generics.GenericAPIView):
    """Doar gazda: închide votul înainte ca toți să termine."""

    serializer_class = s.RoomDetailSerializer

    @transaction.atomic
    def post(self, request, pk):
        room, member = get_room_as_member(request, pk, lock=True)
        require_host(room, member)
        if room.status != Room.Status.VOTING:
            raise Conflict("NOT_VOTING", "Votul nu este deschis.")
        room.status = Room.Status.RESULTS
        room.save(update_fields=["status"])
        return Response(_detail(room, member))


class RoomPickView(generics.GenericAPIView):
    """POST /rooms/:id/pick `{ movieId }` — alegerea finală; intră în istoricul participanților cu cont."""

    serializer_class = s.PickSerializer

    @transaction.atomic
    def post(self, request, pk):
        room, member = get_room_as_member(request, pk, lock=True)
        require_host(room, member)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if room.status != Room.Status.RESULTS:
            raise Conflict("NOT_IN_RESULTS", "Poți alege filmul doar după încheierea votului.")
        movie = get_object_or_404(Movie, pk=ser.validated_data["movie_id"], roommovie__room=room)
        room.picked_movie = movie
        room.status = Room.Status.CLOSED
        room.save(update_fields=["picked_movie", "status"])
        for m in room.members.filter(user__isnull=False):
            WatchedMovie.objects.get_or_create(user_id=m.user_id, movie=movie, room=room)
        return Response(_detail(room, member))
