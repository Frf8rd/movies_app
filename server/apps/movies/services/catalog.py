"""
Catalog „live”: filmele vin direct de la TMDB (cu cache în memorie) și NU se salvează în baza de date.
Un film intră în DB doar când este folosit: pachet de cameră, watchlist, listă (vezi `ensure_movie`).

Identificatorul public al unui film (`id` în JSON) este id-ul TMDB, la fel ca `tmdbId`.
"""
import hashlib
import json
import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.core.exceptions import ApiError
from apps.movies.models import Genre, Movie, StreamingProvider

from .movie_sync import _pick_trailer, save_movie
from .tmdb_client import TMDBClient, TMDBError

log = logging.getLogger(__name__)

TTL_LISTS = 10 * 60  # trending / căutare / discover
TTL_DETAILS = 6 * 3600
TTL_GENRES = 24 * 3600
MAX_TMDB_PAGE = 500  # TMDB nu dă mai mult de 500 de pagini
BROWSE_MIN_VOTES = 50  # la căutarea cu filtre, ca să nu apară filme fără nicio evaluare

_client: TMDBClient | None = None


def tmdb_enabled() -> bool:
    """Fără cheie TMDB (ex. mod demo cu `seed_demo`, teste) aplicația folosește filmele din DB."""
    return bool(settings.TMDB_API_KEY)


def get_client() -> TMDBClient:
    global _client
    if _client is None:
        _client = TMDBClient()
    return _client


# --- cache + tratarea erorilor -------------------------------------------------------------


def _cached(parts: tuple, ttl: int, fn):
    raw = json.dumps([settings.TMDB_LANGUAGE, *parts], sort_keys=True, default=str)
    key = "tmdb:" + hashlib.md5(raw.encode()).hexdigest()
    hit = cache.get(key)
    if hit is not None:
        return hit
    value = fn()
    cache.set(key, value, ttl)
    return value


def _call(fn):
    """Rulează un apel TMDB și transformă erorile în erori de API clare (404 / 502)."""
    try:
        return fn()
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise ApiError(404, "MOVIE_NOT_FOUND", "Filmul nu există.") from exc
        log.warning("TMDB HTTP error: %s", exc)
        raise ApiError(502, "TMDB_UNAVAILABLE", "Serviciul de filme nu răspunde. Încearcă din nou.") from exc
    except (TMDBError, requests.RequestException) as exc:
        log.warning("TMDB error: %s", exc)
        raise ApiError(502, "TMDB_UNAVAILABLE", "Serviciul de filme nu răspunde. Încearcă din nou.") from exc


def _fetch(parts: tuple, ttl: int, call):
    return _cached(parts, ttl, lambda: _call(call))


# --- apeluri cu cache ----------------------------------------------------------------------


def fetch_details(tmdb_id: int) -> dict:
    """Detalii + trailer + platforme pentru toate țările (nu atinge baza de date: sigur în thread-uri)."""
    return _fetch(("movie", tmdb_id), TTL_DETAILS, lambda: get_client().movie_details(tmdb_id))


def discover_page(filters: dict, page: int) -> dict:
    return _fetch(("discover", filters, page), TTL_LISTS, lambda: get_client().discover(filters, page))


def genre_names() -> dict[int, str]:
    """tmdb_id -> nume. Din DB (tabela mică, sincronizată cu `sync_movies --genres`), altfel de la TMDB."""
    key = "tmdb:genre-names:" + settings.TMDB_LANGUAGE
    names = cache.get(key)
    if names:
        return names
    names = dict(Genre.objects.values_list("tmdb_id", "name"))
    if not names:
        try:
            names = {g["id"]: g["name"] for g in get_client().genres()}
        except (TMDBError, requests.RequestException):
            return {}  # nu punem în cache un rezultat gol
    cache.set(key, names, TTL_GENRES)
    return names


# --- conversia răspunsurilor TMDB în forma API-ului nostru ---------------------------------


def _year(release: str):
    return int(release[:4]) if release[:4].isdigit() else None


def _poster(path) -> str:
    return f"{settings.TMDB_IMAGE_BASE}{path}" if path else ""


def card(item: dict, names: dict[int, str]) -> dict:
    """Card scurt dintr-un rezultat de listă TMDB. Listele TMDB nu au durată și platforme."""
    return {
        "id": item["id"],
        "tmdb_id": item["id"],
        "title": item.get("title") or item.get("original_title") or "?",
        "year": _year(item.get("release_date") or ""),
        "runtime": None,
        "rating": round(float(item.get("vote_average") or 0), 1),
        "poster_url": _poster(item.get("poster_path")),
        "genres": [names[g] for g in item.get("genre_ids", []) if g in names],
        "providers": [],
    }


def detail_from_tmdb(data: dict, country: str) -> dict:
    genres = data.get("genres", [])
    internal_genres = dict(Genre.objects.filter(tmdb_id__in=[g["id"] for g in genres]).values_list("tmdb_id", "id"))
    region = (data.get("watch/providers") or {}).get("results", {}).get(country, {})
    flatrate = region.get("flatrate", [])
    internal_providers = dict(
        StreamingProvider.objects.filter(tmdb_id__in=[p["provider_id"] for p in flatrate]).values_list("tmdb_id", "id")
    )
    trailer = _pick_trailer(data.get("videos"))
    return {
        "id": data["id"],
        "tmdb_id": data["id"],
        "title": data.get("title") or data.get("original_title") or "?",
        "year": _year(data.get("release_date") or ""),
        "runtime": data.get("runtime") or None,
        "rating": round(float(data.get("vote_average") or 0), 1),
        "poster_url": _poster(data.get("poster_path")),
        "genres": [{"id": internal_genres.get(g["id"], g["id"]), "tmdb_id": g["id"], "name": g["name"]} for g in genres],
        "providers": [
            {
                "id": internal_providers.get(p["provider_id"], p["provider_id"]),
                "tmdb_id": p["provider_id"],
                "name": p["provider_name"],
                "logo_url": f"https://image.tmdb.org/t/p/w92{p['logo_path']}" if p.get("logo_path") else "",
            }
            for p in flatrate
        ],
        "overview": data.get("overview") or "",
        "trailer_key": trailer,
        "trailer_url": f"https://www.youtube.com/watch?v={trailer}" if trailer else "",
    }


# --- ce folosesc view-urile ----------------------------------------------------------------


def trending(limit: int) -> list[dict]:
    names = genre_names()
    items: list[dict] = []
    for page in range(1, -(-limit // 20) + 1):
        data = _fetch(("trending", page), TTL_LISTS, lambda p=page: get_client().trending(p))
        items.extend(data["results"])
    return [card(i, names) for i in items if not i.get("adult")][:limit]


def browse(
    *,
    q: str = "",
    page: int = 1,
    genre_tmdb_ids=(),
    provider_tmdb_ids=(),
    country: str = "RO",
    max_runtime: int | None = None,
    year_from: int | None = None,
    min_rating: float | None = None,
) -> dict:
    """
    Căutare. Cu `q` → /search/movie (TMDB nu permite acolo filtre de durată și platformă;
    gen, an și notă se aplică pe rezultatele paginii). Fără `q` → /discover/movie cu toate filtrele.
    """
    page = min(max(page, 1), MAX_TMDB_PAGE)
    names = genre_names()
    if q:
        data = _fetch(("search", q, page), TTL_LISTS, lambda: get_client().search(q, page))
        results = data["results"]
        if genre_tmdb_ids:
            results = [r for r in results if set(r.get("genre_ids", [])) & set(genre_tmdb_ids)]
        if year_from:
            results = [r for r in results if (_year(r.get("release_date") or "") or 0) >= year_from]
        if min_rating is not None:
            results = [r for r in results if (r.get("vote_average") or 0) >= min_rating]
    else:
        filters = {"sort_by": "popularity.desc", "include_adult": "false", "vote_count.gte": BROWSE_MIN_VOTES}
        if genre_tmdb_ids:
            filters["with_genres"] = "|".join(str(g) for g in genre_tmdb_ids)  # | = oricare dintre ele
        if provider_tmdb_ids:
            filters.update(
                with_watch_providers="|".join(str(p) for p in provider_tmdb_ids),
                watch_region=country,
                with_watch_monetization_types="flatrate",
            )
        if max_runtime:
            filters["with_runtime.lte"] = max_runtime
        if year_from:
            filters["primary_release_date.gte"] = f"{year_from}-01-01"
        if min_rating is not None:
            filters["vote_average.gte"] = min_rating
        data = discover_page(filters, page)
        results = data["results"]
    return {
        "count": data.get("total_results", len(results)),
        "total_pages": min(data.get("total_pages", 1), MAX_TMDB_PAGE),
        "page": page,
        "results": [card(r, names) for r in results if not r.get("adult")],
    }


def detail(tmdb_id: int, country: str) -> dict:
    return detail_from_tmdb(fetch_details(tmdb_id), country)


def user_country(user) -> str:
    prefs = getattr(user, "preferences", None)
    return prefs.country if prefs else settings.DEFAULT_COUNTRY


def is_fresh(movie: Movie) -> bool:
    """Datele salvate se reîmprospătează după MOVIE_REFRESH_DAYS zile (cerință TMDB)."""
    return timezone.now() - movie.updated_at <= timedelta(days=settings.MOVIE_REFRESH_DAYS)


def ensure_movie(tmdb_id: int, country: str) -> Movie:
    """Filmul din DB; dacă lipsește (sau e vechi), îl aduce de la TMDB și îl salvează acum."""
    movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
    if not tmdb_enabled():
        if movie:
            return movie
        raise ApiError(404, "MOVIE_NOT_FOUND", "Filmul nu există.")
    if movie and is_fresh(movie):
        return movie
    try:
        data = fetch_details(tmdb_id)
    except ApiError:
        if movie:  # TMDB nu răspunde, dar avem o versiune mai veche
            return movie
        raise
    return save_movie(data, country)
