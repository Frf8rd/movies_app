"""Autorizare pe resursă: cine are voie să vadă/modifice o cameră."""
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import is_registered

from .models import Room, RoomMember


def get_room_member(request, room: Room) -> RoomMember | None:
    """Participantul curent din cameră (utilizator cu cont sau invitat), ori None."""
    user = request.user
    if getattr(user, "is_guest", False):
        return user.member if user.room_id == room.id else None
    if is_registered(user):
        return RoomMember.objects.filter(room=room, user=user).first()
    return None


def get_room_as_member(request, pk: int, lock: bool = False) -> tuple[Room, RoomMember]:
    """404 dacă nu există camera, 403 dacă nu ești participant."""
    qs = Room.objects.select_for_update() if lock else Room.objects.all()
    room = get_object_or_404(qs, pk=pk)
    member = get_room_member(request, room)
    if member is None:
        raise PermissionDenied("Nu faci parte din această cameră.")
    return room, member


def require_host(room: Room, member: RoomMember):
    if member.user_id is None or member.user_id != room.host_id:
        raise PermissionDenied("Doar gazda poate face asta.")
