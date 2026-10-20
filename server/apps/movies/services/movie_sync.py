"""Salvează (cache) în baza de date datele aduse din TMDB."""
from decimal import Decimal

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


def save_movie(data: dict, country: str) -> Movie:
    """`data` = răspunsul /movie/{id}?append_to_response=videos,watch/providers

    Scris cu cât mai puține interogări posibil: baza de date (Neon) poate fi departe de server,
    iar fiecare interogare costă un drum dus-întors. Rulează în tranzacția apelantului (view-ul).
    """
    release = data.get("release_date") or ""
    fields = {
        "title": data.get("title") or data.get("original_title") or "?",
        "overview": data.get("overview") or "",
        "year": int(release[:4]) if release[:4].isdigit() else None,
        "runtime": data.get("runtime") or None,
        "rating": Decimal(str(round(data.get("vote_average") or 0, 1))),
        "poster_path": data.get("poster_path") or "",
        "trailer_key": _pick_trailer(data.get("videos")),
        "popularity": data.get("popularity") or 0,
    }
    movie = Movie.objects.filter(tmdb_id=data["id"]).first()
    if movie is None:
        movie = Movie.objects.create(tmdb_id=data["id"], **fields)
    else:
        for k, v in fields.items():
            setattr(movie, k, v)
        movie.save()

    # genuri: o interogare pentru cele existente, creăm doar ce lipsește
    raw_genres = {g["id"]: g["name"] for g in data.get("genres", [])}
    genres = {g.tmdb_id: g for g in Genre.objects.filter(tmdb_id__in=list(raw_genres))}
    for gid, name in raw_genres.items():
        if gid not in genres:
            genres[gid] = Genre.objects.create(tmdb_id=gid, name=name)
    movie.genres.set(list(genres.values()))

    # platforme (doar abonament: Netflix, HBO Max…), la fel: citire în bloc + creare doar a lipsurilor
    region = (data.get("watch/providers") or {}).get("results", {}).get(country, {})
    raw_providers = {p["provider_id"]: p for p in region.get("flatrate", [])}
    providers = {p.tmdb_id: p for p in StreamingProvider.objects.filter(tmdb_id__in=list(raw_providers))}
    for pid, p in raw_providers.items():
        if pid not in providers:
            providers[pid] = StreamingProvider.objects.create(
                tmdb_id=pid, name=p["provider_name"], logo_path=p.get("logo_path") or ""
            )
    MovieProvider.objects.filter(movie=movie, country=country).delete()
    MovieProvider.objects.bulk_create(
        [MovieProvider(movie=movie, provider=pr, country=country) for pr in providers.values()]
    )
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
