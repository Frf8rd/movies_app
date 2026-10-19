"""Salvează (cache) în baza de date datele aduse din TMDB."""
from decimal import Decimal

from django.db import transaction

from apps.movies.models import Genre, Movie, MovieProvider, StreamingProvider


def sync_genres(client) -> int:
    n = 0
    for g in client.genres():
        Genre.objects.update_or_create(tmdb_id=g["id"], defaults={"name": g["name"]})
        n += 1
    return n


def sync_providers(client, country: str) -> int:
    n = 0
    for p in client.providers(country):
        StreamingProvider.objects.update_or_create(
            tmdb_id=p["provider_id"],
            defaults={"name": p["provider_name"], "logo_path": p.get("logo_path") or ""},
        )
        n += 1
    return n


def _pick_trailer(videos: dict) -> str:
    results = (videos or {}).get("results", [])
    youtube = [v for v in results if v.get("site") == "YouTube"]
    for kind in ("Trailer", "Teaser"):
        for v in youtube:
            if v.get("type") == kind:
                return v["key"]
    return ""


@transaction.atomic
def save_movie(data: dict, country: str) -> Movie:
    """`data` = răspunsul /movie/{id}?append_to_response=videos,watch/providers"""
    release = data.get("release_date") or ""
    movie, _ = Movie.objects.update_or_create(
        tmdb_id=data["id"],
        defaults={
            "title": data.get("title") or data.get("original_title") or "?",
            "overview": data.get("overview") or "",
            "year": int(release[:4]) if release[:4].isdigit() else None,
            "runtime": data.get("runtime") or None,
            "rating": Decimal(str(round(data.get("vote_average") or 0, 1))),
            "poster_path": data.get("poster_path") or "",
            "trailer_key": _pick_trailer(data.get("videos")),
            "popularity": data.get("popularity") or 0,
        },
    )

    genres = []
    for g in data.get("genres", []):
        genre, _ = Genre.objects.get_or_create(tmdb_id=g["id"], defaults={"name": g["name"]})
        genres.append(genre)
    movie.genres.set(genres)

    region = (data.get("watch/providers") or {}).get("results", {}).get(country, {})
    MovieProvider.objects.filter(movie=movie, country=country).delete()
    for p in region.get("flatrate", []):  # doar abonament (Netflix, HBO Max…)
        provider, _ = StreamingProvider.objects.get_or_create(
            tmdb_id=p["provider_id"],
            defaults={"name": p["provider_name"], "logo_path": p.get("logo_path") or ""},
        )
        MovieProvider.objects.get_or_create(movie=movie, provider=provider, country=country)
    return movie


def sync_popular_movies(client, country: str, pages: int, log=lambda msg: None) -> int:
    saved = 0
    for page in range(1, pages + 1):
        for item in client.popular(page):
            try:
                save_movie(client.movie_details(item["id"]), country)
                saved += 1
            except Exception as exc:  # un film stricat nu oprește tot sync-ul
                log(f"  ! film {item.get('id')} sărit: {exc}")
        log(f"  pagina {page}/{pages} gata ({saved} filme)")
    return saved
