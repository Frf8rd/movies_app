"""Client minimal pentru TMDB. Singurul loc din proiect care vorbește cu TMDB; cheia rămâne doar pe server."""
import time

import requests
from django.conf import settings

BASE_URL = "https://api.themoviedb.org/3"


class TMDBError(Exception):
    pass


class TMDBClient:
    def __init__(self, api_key: str | None = None, language: str | None = None, session=None):
        self.api_key = api_key or settings.TMDB_API_KEY
        self.language = language or settings.TMDB_LANGUAGE
        if not self.api_key:
            raise TMDBError("Lipsește TMDB_API_KEY (setează-l în server/.env).")
        self.session = session or requests.Session()

    def _get(self, path: str, **params) -> dict:
        params.setdefault("language", self.language)
        headers = {"accept": "application/json"}
        if len(self.api_key) > 40:  # „API Read Access Token” (v4) se trimite ca Bearer
            headers["Authorization"] = f"Bearer {self.api_key}"
        else:  # cheia v3 clasică
            params["api_key"] = self.api_key

        for attempt in range(4):
            resp = self.session.get(f"{BASE_URL}{path}", params=params, headers=headers, timeout=15)
            if resp.status_code == 429 or resp.status_code >= 500:
                time.sleep(float(resp.headers.get("Retry-After", 1 + attempt)))
                continue
            if resp.status_code == 401:
                raise TMDBError("TMDB a respins cheia API (401). Verifică TMDB_API_KEY.")
            resp.raise_for_status()
            return resp.json()
        raise TMDBError(f"TMDB nu răspunde la {path}")

    def genres(self) -> list[dict]:
        return self._get("/genre/movie/list")["genres"]

    def providers(self, country: str) -> list[dict]:
        return self._get("/watch/providers/movie", watch_region=country)["results"]

    def popular(self, page: int) -> list[dict]:
        return self._get("/movie/popular", page=page)["results"]

    def movie_details(self, tmdb_id: int) -> dict:
        """Un singur apel: detalii + trailer + platforme (append_to_response)."""
        return self._get(
            f"/movie/{tmdb_id}",
            append_to_response="videos,watch/providers",
            include_video_language="ro,en,null",
        )
