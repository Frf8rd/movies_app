from django.conf import settings
from rest_framework import serializers

from .models import Genre, Movie, StreamingProvider


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "tmdb_id", "name"]


class ProviderSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = StreamingProvider
        fields = ["id", "tmdb_id", "name", "logo_url"]

    def get_logo_url(self, obj) -> str:
        return f"https://image.tmdb.org/t/p/w92{obj.logo_path}" if obj.logo_path else ""


class MovieSummarySerializer(serializers.ModelSerializer):
    """Varianta scurtă, pentru carduri (deck, rezultate, liste). Context opțional: `country`."""

    poster_url = serializers.SerializerMethodField()
    genres = serializers.SerializerMethodField()
    providers = serializers.SerializerMethodField()
    rating = serializers.FloatField()

    class Meta:
        model = Movie
        fields = ["id", "tmdb_id", "title", "year", "runtime", "rating", "poster_url", "genres", "providers"]

    def get_poster_url(self, obj) -> str:
        return f"{settings.TMDB_IMAGE_BASE}{obj.poster_path}" if obj.poster_path else ""

    def get_genres(self, obj) -> list[str]:
        return [g.name for g in obj.genres.all()]

    def get_providers(self, obj) -> list[dict]:
        country = self.context.get("country") or settings.DEFAULT_COUNTRY
        seen, out = set(), []
        for mp in obj.providers.all():
            if mp.country == country and mp.provider_id not in seen:
                seen.add(mp.provider_id)
                out.append(ProviderSerializer(mp.provider).data)
        return out


class MovieDetailSerializer(MovieSummarySerializer):
    trailer_url = serializers.SerializerMethodField()
    genres = GenreSerializer(many=True, read_only=True)

    class Meta(MovieSummarySerializer.Meta):
        fields = MovieSummarySerializer.Meta.fields + ["overview", "trailer_key", "trailer_url"]

    def get_trailer_url(self, obj) -> str:
        return f"https://www.youtube.com/watch?v={obj.trailer_key}" if obj.trailer_key else ""


def with_card_relations(qs):
    """Încarcă dintr-o dată genurile și platformele (evită N+1)."""
    return qs.prefetch_related("genres", "providers__provider")
