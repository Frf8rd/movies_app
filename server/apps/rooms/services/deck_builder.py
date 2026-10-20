"""
Alege filmele (pachetul de carduri) pentru o cameră, pe baza filtrelor.

- Cu cheie TMDB: pachetul se ia live de la TMDB (/discover, pagini aleatorii din cele mai populare),
  iar în DB se salvează doar filmele alese.
- Dacă gazda a ales o listă (`source_list`) sau nu există cheie TMDB (mod demo): filmele din DB.
"""
import logging
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from django.conf import settings

from apps.core.exceptions import ApiError, Unprocessable
from apps.library.models import WatchedMovie
from apps.movies.models import Movie
from apps.movies.services import catalog
from apps.movies.services.movie_sync import save_movie

from ..models import Room, RoomMovie

log = logging.getLogger(__name__)

EXTRA_CANDIDATES = 6  # câteva filme în plus, pentru cazul în care detaliile unuia nu pot fi aduse


def host_country(room: Room) -> str:
    prefs = getattr(room.host, "preferences", None)
    return prefs.country if prefs else settings.DEFAULT_COUNTRY


def _too_small(found: int) -> Unprocessable:
    return Unprocessable("DECK_TOO_SMALL", f"Filtrele sunt prea stricte (doar {found} filme găsite). Relaxează-le puțin.")


# --- varianta din DB (liste proprii / mod demo) --------------------------------------------


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


def _movies_from_db(room: Room, country: str, rng: random.Random) -> list[Movie]:
    # luăm o plajă mai largă de filme populare și amestecăm puțin, ca pachetele să nu fie mereu identice
    pool = list(candidate_movies(room, country)[: room.deck_size * 2])
    if len(pool) < settings.ROOM_MIN_DECK_SIZE:
        raise _too_small(len(pool))
    chosen = rng.sample(pool, min(room.deck_size, len(pool)))
    rng.shuffle(chosen)
    return chosen


# --- varianta live de la TMDB --------------------------------------------------------------


def discover_filters(room: Room, country: str) -> dict:
    f = {
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "vote_count.gte": settings.TMDB_MIN_VOTES,
        "primary_release_date.lte": date.today().isoformat(),  # doar filme lansate deja
    }
    genres = list(room.genres.values_list("tmdb_id", flat=True))
    if genres:
        f["with_genres"] = "|".join(str(g) for g in genres)  # | = oricare dintre genuri
    providers = list(room.providers.values_list("tmdb_id", flat=True))
    if providers:
        f.update(
            with_watch_providers="|".join(str(p) for p in providers),
            watch_region=country,
            with_watch_monetization_types="flatrate",  # la fel ca ce salvăm în DB
        )
    if room.max_runtime:
        f["with_runtime.lte"] = room.max_runtime
    if room.year_from:
        f["primary_release_date.gte"] = f"{room.year_from}-01-01"
    if room.min_rating is not None:
        f["vote_average.gte"] = float(room.min_rating)
    return f


def _parallel(fn, items, workers=8):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(fn, items))


def _movies_from_tmdb(room: Room, country: str, rng: random.Random) -> list[Movie]:
    filters = discover_filters(room, country)
    first = catalog.discover_page(filters, 1)
    if first.get("total_results", 0) < settings.ROOM_MIN_DECK_SIZE:
        raise _too_small(first.get("total_results", 0))

    # pagini aleatorii din cele mai populare: fiecare cameră primește alt pachet
    max_page = max(1, min(first.get("total_pages", 1), settings.TMDB_DECK_MAX_PAGE))
    wanted = min(max_page, max(2, -(-room.deck_size // 20) + 1))
    pages = rng.sample(range(1, max_page + 1), wanted)
    by_page = {1: first}
    for page, data in zip(
        [p for p in pages if p != 1],
        _parallel(lambda p: catalog.discover_page(filters, p), [p for p in pages if p != 1]),
    ):
        by_page[page] = data

    pool: dict[int, dict] = {}
    for page in pages:
        for item in by_page[page]["results"]:
            if not item.get("adult"):
                pool.setdefault(item["id"], item)
    ids = list(pool)

    # nu repetăm filme pe care participanții cu cont le-au văzut deja (doar dacă rămân destule)
    user_ids = list(room.members.filter(user__isnull=False).values_list("user_id", flat=True))
    watched = set(WatchedMovie.objects.filter(user_id__in=user_ids).values_list("movie__tmdb_id", flat=True))
    unseen = [i for i in ids if i not in watched]
    if len(unseen) >= settings.ROOM_MIN_DECK_SIZE:
        ids = unseen
    if len(ids) < settings.ROOM_MIN_DECK_SIZE:
        raise _too_small(len(ids))

    candidates = rng.sample(ids, min(len(ids), room.deck_size + EXTRA_CANDIDATES))

    # filmele deja salvate și proaspete nu se mai cer; restul se aduc în paralel (detalii + platforme)
    existing = {m.tmdb_id: m for m in Movie.objects.filter(tmdb_id__in=candidates)}
    to_fetch = [i for i in candidates if i not in existing or not catalog.is_fresh(existing[i])]

    def fetch(tmdb_id):
        try:
            return tmdb_id, catalog.fetch_details(tmdb_id)
        except ApiError:
            return tmdb_id, None

    details = dict(_parallel(fetch, to_fetch))

    chosen: list[Movie] = []
    for tmdb_id in candidates:  # DB-ul se atinge doar aici, în thread-ul principal
        data = details.get(tmdb_id)
        movie = save_movie(data, country) if data else existing.get(tmdb_id)
        if movie:
            chosen.append(movie)
        if len(chosen) == room.deck_size:
            break
    if len(chosen) < settings.ROOM_MIN_DECK_SIZE:
        raise ApiError(502, "TMDB_UNAVAILABLE", "Nu am putut aduce filmele de la TMDB. Încearcă din nou.")
    rng.shuffle(chosen)
    return chosen


def build_deck(room: Room, rng: random.Random | None = None) -> list[RoomMovie]:
    """Creează RoomMovie pentru cameră. 422 dacă rămân prea puține filme. Toți primesc același pachet."""
    rng = rng or random.Random()
    country = host_country(room)
    if room.source_list_id or not catalog.tmdb_enabled():
        movies = _movies_from_db(room, country, rng)
    else:
        movies = _movies_from_tmdb(room, country, rng)
    room.deck.all().delete()
    return RoomMovie.objects.bulk_create([RoomMovie(room=room, movie=m, position=i) for i, m in enumerate(movies)])
