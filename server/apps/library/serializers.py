from rest_framework import serializers

from apps.movies.serializers import MovieSummarySerializer

from .models import WatchedMovie, WatchlistItem


class WatchlistItemSerializer(serializers.ModelSerializer):
    movie = MovieSummarySerializer(read_only=True)

    class Meta:
        model = WatchlistItem
        fields = ["id", "movie", "added_at"]


class AddWatchlistSerializer(serializers.Serializer):
    movie_id = serializers.IntegerField()


class WatchedMovieSerializer(serializers.ModelSerializer):
    movie = MovieSummarySerializer(read_only=True)
    room_title = serializers.CharField(source="room.title", read_only=True, default=None)

    class Meta:
        model = WatchedMovie
        fields = ["id", "movie", "room", "room_title", "watched_on", "my_rating"]
        read_only_fields = ["id", "movie", "room", "room_title", "watched_on"]


class RatingSerializer(serializers.Serializer):
    my_rating = serializers.IntegerField(min_value=1, max_value=10, allow_null=True)
