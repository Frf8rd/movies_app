"""Autentificare pentru invitați: JWT scurt, legat de o singură cameră și de un singur participant."""
from datetime import datetime, timezone

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import RoomMember

GUEST_TOKEN_TYPE = "guest"


class GuestPrincipal:
    """Ia locul lui `request.user` pentru un invitat. Nu are cont, deci nu trece de IsRegisteredUser."""

    is_authenticated = True
    is_anonymous = False
    is_guest = True
    pk = None
    id = None

    def __init__(self, member: RoomMember):
        self.member = member
        self.member_id = member.id
        self.room_id = member.room_id

    def __str__(self):
        return f"guest:{self.member.nickname}"


def issue_guest_token(member: RoomMember) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "typ": GUEST_TOKEN_TYPE,
        "member_id": member.id,
        "room_id": member.room_id,
        "iat": now,
        "exp": now + settings.GUEST_TOKEN_LIFETIME,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


class GuestJWTAuthentication(BaseAuthentication):
    """Dacă tokenul nu e de invitat, nu face nimic — lasă JWTAuthentication-ul obișnuit să decidă."""

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if len(parts) != 2 or parts[0].lower() != b"bearer":
            return None
        try:
            payload = jwt.decode(parts[1], settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            # distingem tokenul expirat de invitat de cel de utilizator doar dacă are tipul „guest”
            unverified = jwt.decode(parts[1], options={"verify_signature": False, "verify_exp": False})
            if unverified.get("typ") == GUEST_TOKEN_TYPE:
                raise AuthenticationFailed("Sesiunea de invitat a expirat. Intră din nou cu codul camerei.")
            return None
        except jwt.PyJWTError:
            return None
        if payload.get("typ") != GUEST_TOKEN_TYPE:
            return None
        try:
            member = RoomMember.objects.select_related("room").get(
                pk=payload["member_id"], room_id=payload["room_id"], is_guest=True
            )
        except (KeyError, RoomMember.DoesNotExist):
            raise AuthenticationFailed("Invitatul nu mai face parte din cameră.")
        return GuestPrincipal(member), parts[1]

    def authenticate_header(self, request):
        return "Bearer"
