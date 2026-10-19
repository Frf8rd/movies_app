from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response

from apps.core.exceptions import Conflict
from apps.movies.models import Genre, Movie

from .models import WatchedMovie, WatchlistItem
from .serializers import AddWatchlistSerializer, RatingSerializer, WatchedMovieSerializer, WatchlistItemSerializer


def _country(user) -> str:
    prefs = getattr(user, "preferences", None)
    return prefs.country if prefs else "RO"


class WatchlistView(generics.GenericAPIView):
    """GET /me/watchlist · POST /me/watchlist `{ movieId }`"""

    serializer_class = WatchlistItemSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "country": _country(self.request.user)}

    def get(self, request):
        qs = WatchlistItem.objects.filter(user=request.user).select_related("movie").prefetch_related(
            "movie__genres", "movie__providers__provider"
        )
        return Response(self.get_serializer(qs, many=True).data)

    def post(self, request):
        body = AddWatchlistSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        movie = get_object_or_404(Movie, pk=body.validated_data["movie_id"])
        item, created = WatchlistItem.objects.get_or_create(user=request.user, movie=movie)
        if not created:
            raise Conflict("ALREADY_IN_WATCHLIST", "Filmul este deja în watchlist.")
        return Response(self.get_serializer(item).data, status=status.HTTP_201_CREATED)


class WatchlistDeleteView(generics.GenericAPIView):
    serializer_class = WatchlistItemSerializer

    def delete(self, request, movie_id):
        deleted, _ = WatchlistItem.objects.filter(user=request.user, movie_id=movie_id).delete()
        if not deleted:
            return Response({"error": {"code": "NOT_FOUND", "message": "Filmul nu e în watchlist."}}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


class HistoryView(generics.ListAPIView):
    """Filmele văzute."""

    serializer_class = WatchedMovieSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "country": _country(self.request.user)}

    def get_queryset(self):
        return (
            WatchedMovie.objects.filter(user=self.request.user)
            .select_related("movie", "room")
            .prefetch_related("movie__genres", "movie__providers__provider")
        )


class HistoryDetailView(generics.GenericAPIView):
    """PATCH /me/history/:id `{ myRating }` (1–10, sau null ca să ștergi nota)."""

    serializer_class = RatingSerializer

    def patch(self, request, pk):
        entry = get_object_or_404(WatchedMovie, pk=pk, user=request.user)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        entry.my_rating = ser.validated_data["my_rating"]
        entry.save(update_fields=["my_rating"])
        return Response(WatchedMovieSerializer(entry, context=self.get_serializer_context()).data)


class StatsView(generics.GenericAPIView):
    """Statistici personale pentru ecranul Profil."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        user = request.user
        history = WatchedMovie.objects.filter(user=user)
        fav = (
            Genre.objects.filter(movies__watchedmovie__user=user)
            .annotate(n=Count("movies__watchedmovie"))
            .order_by("-n", "name")
            .first()
        )
        if fav is None:
            prefs = getattr(user, "preferences", None)
            fav = prefs.favorite_genres.first() if prefs else None
        return Response(
            {
                "movie_nights": history.exclude(room__isnull=True).values("room").distinct().count(),
                "watched_count": history.count(),
                "watchlist_count": WatchlistItem.objects.filter(user=user).count(),
                "favorite_genre": fav.name if fav else None,
            }
        )
