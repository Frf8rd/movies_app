from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.response import Response

from apps.core.exceptions import Conflict
from apps.movies.models import Movie

from .models import MovieList, MovieListItem
from .serializers import AddItemSerializer, MovieListDetailSerializer, MovieListSerializer


class MovieListViewSet(viewsets.ModelViewSet):
    """Listele mele (Prieteni / Familie / Cuplu / Altele). Fiecare utilizator le vede doar pe ale lui."""

    def get_queryset(self):
        return MovieList.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        return MovieListDetailSerializer if self.action == "retrieve" else MovieListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        prefs = getattr(self.request.user, "preferences", None)
        if prefs:
            ctx["country"] = prefs.country
        return ctx

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MovieListItemView(generics.GenericAPIView):
    """POST /lists/:id/items `{ movieId }` · DELETE /lists/:id/items/:movieId"""

    serializer_class = AddItemSerializer

    def _list(self, pk):
        return get_object_or_404(MovieList, pk=pk, owner=self.request.user)

    def post(self, request, pk):
        movie_list = self._list(pk)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        movie = get_object_or_404(Movie, pk=ser.validated_data["movie_id"])
        _, created = MovieListItem.objects.get_or_create(movie_list=movie_list, movie=movie)
        if not created:
            raise Conflict("ALREADY_IN_LIST", "Filmul este deja în listă.")
        return Response(MovieListSerializer(movie_list).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk, movie_id):
        deleted, _ = MovieListItem.objects.filter(movie_list=self._list(pk), movie_id=movie_id).delete()
        if not deleted:
            return Response({"error": {"code": "NOT_FOUND", "message": "Filmul nu e în listă."}}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
