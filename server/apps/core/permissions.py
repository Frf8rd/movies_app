from rest_framework.permissions import BasePermission


def is_registered(user) -> bool:
    """Utilizator cu cont (nu invitat, nu anonim)."""
    return bool(getattr(user, "is_authenticated", False)) and not getattr(user, "is_guest", False)


class IsRegisteredUser(BasePermission):
    """Implicit pe tot API-ul: doar utilizatori cu cont."""

    def has_permission(self, request, view):
        return is_registered(request.user)


class IsUserOrGuest(BasePermission):
    """Pentru rutele de cameră: utilizator cu cont SAU invitat cu guest token."""

    def has_permission(self, request, view):
        return bool(getattr(request.user, "is_authenticated", False))
