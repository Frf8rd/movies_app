from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserPreference

User = get_user_model()


def get_preferences(user) -> UserPreference:
    prefs, _ = UserPreference.objects.get_or_create(user=user)
    return prefs


def unique_username(email: str) -> str:
    base = (email.split("@")[0] or "user")[:120]
    candidate, n = base, 1
    while User.objects.filter(username=candidate).exists():
        n += 1
        candidate = f"{base}{n}"
    return candidate


def create_user(name: str, email: str, password: str):
    user = User.objects.create_user(
        username=unique_username(email), email=email.lower(), password=password, first_name=name
    )
    UserPreference.objects.create(user=user)
    return user


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
