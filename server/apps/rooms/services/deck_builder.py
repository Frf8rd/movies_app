"""Alege filmele (pachetul de carduri) pentru o cameră, pe baza filtrelor."""
import random

from django.conf import settings

from apps.core.exceptions import Unprocessable
from apps.movies.models import Movie

from ..models import Room, RoomMovie


def candidate_movies(room: Room, country: str):
    qs = Movie.objects.all()
    if room.source_list_id:
        qs = qs.filter(movielistitem__movie_list_id=room.source_list_id)
    genre_ids = list(room.genres.values_list("id", flat=True))
    if genre_ids:
        qs = qs.filter(genres__id__in=genre_ids)
    provider_ids = list(room.providers.values_list("id", flat=True))
    if provider_ids:  # disponibile pe cel puțin una dintre platformele alese
        qs = qs.filter(providers__provider_id__in=provider_ids, providers__country=country)
    if room.max_runtime:
        qs = qs.filter(runtime__isnull=False, runtime__lte=room.max_runtime)
    if room.year_from:
        qs = qs.filter(year__gte=room.year_from)
    if room.min_rating is not None:
        qs = qs.filter(rating__gte=room.min_rating)
    ids = qs.order_by().values_list("id", flat=True).distinct()
    return Movie.objects.filter(id__in=list(ids)).order_by("-popularity", "id")


def build_deck(room: Room, rng: random.Random | None = None) -> list[RoomMovie]:
    """Creează RoomMovie pentru cameră. 422 dacă rămân prea puține filme. Toți primesc același pachet."""
    rng = rng or random.Random()
    prefs = getattr(room.host, "preferences", None)
    country = prefs.country if prefs else settings.DEFAULT_COUNTRY

    # luăm o plajă mai largă de filme populare și amestecăm puțin, ca pachetele să nu fie mereu identice
    pool = list(candidate_movies(room, country)[: room.deck_size * 2])
    if len(pool) < settings.ROOM_MIN_DECK_SIZE:
        raise Unprocessable(
            "DECK_TOO_SMALL",
            f"Filtrele sunt prea stricte (doar {len(pool)} filme găsite). Relaxează-le puțin.",
        )
    chosen = rng.sample(pool, min(room.deck_size, len(pool)))
    rng.shuffle(chosen)
    room.deck.all().delete()
    return RoomMovie.objects.bulk_create(
        [RoomMovie(room=room, movie=m, position=i) for i, m in enumerate(chosen)]
    )
