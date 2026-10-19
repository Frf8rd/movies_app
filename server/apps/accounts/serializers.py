from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.exceptions import ApiError
from apps.movies.models import Genre, StreamingProvider

from .models import UserPreference

User = get_user_model()


def _validate_password(value, user=None):
    try:
        validate_password(value, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))
    return value


class PreferenceSerializer(serializers.ModelSerializer):
    genre_ids = serializers.SerializerMethodField()
    provider_ids = serializers.SerializerMethodField()

    class Meta:
        model = UserPreference
        fields = ["genre_ids", "provider_ids", "country", "onboarded"]

    def get_genre_ids(self, obj) -> list[int]:
        return [g.id for g in obj.favorite_genres.all()]

    def get_provider_ids(self, obj) -> list[int]:
        return [p.id for p in obj.providers.all()]


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name", read_only=True)
    preferences = PreferenceSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "avatar_url", "preferences"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise ApiError(409, "EMAIL_EXISTS", "Există deja un cont cu acest email.")
        return value

    def validate_password(self, value):
        return _validate_password(value)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, max_length=128)

    def validate_new_password(self, value):
        return _validate_password(value, self.context["request"].user)


class MeUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=False)
    avatar_url = serializers.URLField(required=False, allow_blank=True)


class PreferencesUpdateSerializer(serializers.Serializer):
    genre_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    provider_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    country = serializers.RegexField(r"^[A-Za-z]{2}$", required=False)

    def validate_genre_ids(self, ids):
        found = set(Genre.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = set(ids) - found
        if missing:
            raise serializers.ValidationError(f"Genuri inexistente: {sorted(missing)}")
        return ids

    def validate_provider_ids(self, ids):
        found = set(StreamingProvider.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = set(ids) - found
        if missing:
            raise serializers.ValidationError(f"Platforme inexistente: {sorted(missing)}")
        return ids
