from rest_framework import serializers

from apps.movies.serializers import MovieSummarySerializer, with_card_relations

from .models import MovieList


class MovieListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = MovieList
        fields = ["id", "name", "category", "created_at", "item_count"]
        read_only_fields = ["id", "created_at"]


class MovieListDetailSerializer(MovieListSerializer):
    movies = serializers.SerializerMethodField()

    class Meta(MovieListSerializer.Meta):
        fields = MovieListSerializer.Meta.fields + ["movies"]

    def get_movies(self, obj):
        from apps.movies.models import Movie

        qs = with_card_relations(Movie.objects.filter(movielistitem__movie_list=obj)).order_by("-movielistitem__added_at")
        return MovieSummarySerializer(qs, many=True, context=self.context).data


class AddItemSerializer(serializers.Serializer):
    movie_id = serializers.IntegerField()
