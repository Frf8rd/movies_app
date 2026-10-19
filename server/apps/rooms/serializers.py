from rest_framework import serializers

from apps.lists.models import MovieList
from apps.movies.models import Genre, StreamingProvider
from apps.movies.serializers import GenreSerializer, MovieSummarySerializer, ProviderSerializer

from .models import Room, RoomMember, Vote


class RoomCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100)
    genre_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    provider_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    max_runtime = serializers.IntegerField(min_value=30, max_value=500, required=False, allow_null=True)
    year_from = serializers.IntegerField(min_value=1900, max_value=2100, required=False, allow_null=True)
    min_rating = serializers.DecimalField(
        max_digits=3, decimal_places=1, min_value=0, max_value=10, required=False, allow_null=True
    )
    source_list_id = serializers.IntegerField(required=False, allow_null=True)
    deck_size = serializers.IntegerField(min_value=10, max_value=100, required=False, default=30)

    def validate_genre_ids(self, ids):
        if Genre.objects.filter(id__in=ids).count() != len(set(ids)):
            raise serializers.ValidationError("Gen inexistent.")
        return ids

    def validate_provider_ids(self, ids):
        if StreamingProvider.objects.filter(id__in=ids).count() != len(set(ids)):
            raise serializers.ValidationError("Platformă inexistentă.")
        return ids

    def validate_source_list_id(self, value):
        if value is None:
            return value
        user = self.context["request"].user
        if not MovieList.objects.filter(pk=value, owner=user).exists():
            raise serializers.ValidationError("Lista nu există.")
        return value


class JoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)
    nickname = serializers.CharField(max_length=40, required=False, allow_blank=True)


class VoteInputSerializer(serializers.Serializer):
    movie_id = serializers.IntegerField()
    choice = serializers.ChoiceField(choices=[c.name for c in Vote.Choice])


class PickSerializer(serializers.Serializer):
    movie_id = serializers.IntegerField()


class MemberSerializer(serializers.ModelSerializer):
    is_host = serializers.SerializerMethodField()
    finished = serializers.BooleanField(source="finished_voting")

    class Meta:
        model = RoomMember
        fields = ["id", "nickname", "is_guest", "is_host", "finished"]

    def get_is_host(self, obj) -> bool:
        return obj.user_id is not None and obj.user_id == obj.room.host_id


class RoomListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    is_host = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ["id", "code", "title", "status", "member_count", "is_host", "created_at"]

    def get_is_host(self, obj) -> bool:
        return obj.host_id == self.context["request"].user.pk


class RoomDetailSerializer(serializers.ModelSerializer):
    """Starea camerei. Conține cine a intrat și cine a terminat — niciodată voturile."""

    host_name = serializers.CharField(source="host.display_name", read_only=True)
    genres = GenreSerializer(many=True, read_only=True)
    providers = ProviderSerializer(many=True, read_only=True)
    members = MemberSerializer(many=True, read_only=True)
    picked_movie = MovieSummarySerializer(read_only=True)
    my_member_id = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    min_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Room
        fields = [
            "id", "code", "title", "status", "host_name", "is_host", "my_member_id",
            "genres", "providers", "max_runtime", "year_from", "min_rating", "source_list", "deck_size",
            "members", "picked_movie", "created_at",
        ]  # fmt: skip

    def _member(self):
        return self.context.get("member")

    def get_my_member_id(self, obj):
        m = self._member()
        return m.id if m else None

    def get_is_host(self, obj) -> bool:
        m = self._member()
        return bool(m and m.user_id is not None and m.user_id == obj.host_id)
