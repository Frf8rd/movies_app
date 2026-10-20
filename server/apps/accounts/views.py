from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import ApiError

from . import serializers as s
from .services import create_user, get_preferences, tokens_for

User = get_user_model()


def _user_payload(user):
    get_preferences(user)
    user = User.objects.prefetch_related("preferences__favorite_genres", "preferences__providers").get(pk=user.pk)
    return s.UserSerializer(user).data


class _ThrottledAuthView(generics.GenericAPIView):
    throttle_scope = "auth"


class RegisterView(_ThrottledAuthView):
    """Înregistrare → `{ user, access, refresh }`."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    serializer_class = s.RegisterSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user = create_user(d["name"].strip(), d["email"], d["password"])
        return Response({"user": _user_payload(user), **tokens_for(user)}, status=status.HTTP_201_CREATED)


class LoginView(_ThrottledAuthView):
    """Login cu email + parolă → `{ user, access, refresh }`."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    serializer_class = s.LoginSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=ser.validated_data["email"].strip()).first()
        if not user or not user.is_active or not user.check_password(ser.validated_data["password"]):
            raise ApiError(401, "INVALID_CREDENTIALS", "Email sau parolă greșită.")
        return Response({"user": _user_payload(user), **tokens_for(user)})


class RefreshView(_ThrottledAuthView):
    """`{ refresh }` → `{ access, refresh }` (refresh-ul se rotește: păstrează-l pe cel nou)."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    serializer_class = s.RefreshSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            old = RefreshToken(ser.validated_data["refresh"])
            user = User.objects.get(pk=old["user_id"], is_active=True)
            old.blacklist()
        except (TokenError, User.DoesNotExist, KeyError):
            raise ApiError(401, "INVALID_TOKEN", "Token de reînnoire invalid sau expirat.")
        return Response(tokens_for(user))


class LogoutView(generics.GenericAPIView):
    """Invalidează refresh token-ul (blacklist)."""

    serializer_class = s.RefreshSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            RefreshToken(ser.validated_data["refresh"]).blacklist()
        except TokenError:
            pass  # deja invalid = deja delogat
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(_ThrottledAuthView):
    """`{ oldPassword, newPassword }` → tokenuri noi (cele vechi sunt invalidate)."""

    serializer_class = s.ChangePasswordSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(ser.validated_data["old_password"]):
            raise ApiError(400, "WRONG_PASSWORD", "Parola curentă este greșită.")
        user.set_password(ser.validated_data["new_password"])
        user.save(update_fields=["password"])
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(tokens_for(user))


class MeView(generics.GenericAPIView):
    """GET /auth/me · PATCH /me · DELETE /me (ștergere cont + toate datele)."""

    serializer_class = s.UserSerializer

    def get(self, request):
        return Response(_user_payload(request.user))

    def patch(self, request):
        ser = s.MeUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if "name" in ser.validated_data:
            user.first_name = ser.validated_data["name"].strip()
        if "avatar_url" in ser.validated_data:
            user.avatar_url = ser.validated_data["avatar_url"]
        user.save()
        return Response(_user_payload(user))

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PreferencesView(generics.GenericAPIView):
    """PUT `{ genreIds, providerIds, country }` — salvează preferințele (și marchează onboarding-ul ca terminat)."""

    serializer_class = s.PreferencesUpdateSerializer

    def put(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        prefs = get_preferences(request.user)
        if "genre_ids" in d:
            prefs.favorite_genres.set(d["genre_ids"])
        if "provider_ids" in d:
            prefs.providers.set(d["provider_ids"])
        if "country" in d:
            prefs.country = d["country"].upper()
        prefs.onboarded = True
        prefs.save()
        return Response(_user_payload(request.user))
