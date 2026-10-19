import secrets

# fără caractere ambigue: O/0, I/1, L
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6


def normalize_code(raw: str) -> str:
    """„k7f-29q ” -> „K7F29Q”"""
    return "".join(ch for ch in (raw or "").upper() if ch.isalnum())


def generate_room_code() -> str:
    from apps.rooms.models import Room

    for _ in range(50):
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        if not Room.objects.filter(code=code).exists():
            return code
    raise RuntimeError("Nu am putut genera un cod unic de cameră.")
