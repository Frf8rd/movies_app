"""Client minimal pentru TMDB. Singurul loc din proiect care vorbește cu TMDB; cheia rămâne doar pe server."""
import time

import requests
from django.conf import settings

BASE_URL = "https://api.themoviedb.org/3"
RETRY_PAUSE_CAP = 3  # secunde: cererile vin de la utilizatori, nu vrem pauze lungi


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
            try:
                resp = self.session.get(f"{BASE_URL}{path}", params=params, headers=headers, timeout=10)
            except (requests.ConnectionError, requests.Timeout):
                time.sleep(min(1 + attempt, RETRY_PAUSE_CAP))
                continue
            if resp.status_code == 429 or resp.status_code >= 500:
                time.sleep(min(float(resp.headers.get("Retry-After", 1 + attempt)), RETRY_PAUSE_CAP))
                continue
            if resp.status_code == 401:
                raise TMDBError("TMDB a respins cheia API (401). Verifică TMDB_API_KEY.")
            resp.raise_for_status()  # 404 etc. -> requests.HTTPError
            return resp.json()
        raise TMDBError(f"TMDB nu răspunde la {path}")

    def genres(self) -> list[dict]:
        return self._get("/genre/movie/list")["genres"]

    def providers(self, country: str) -> list[dict]:
        return self._get("/watch/providers/movie", watch_region=country)["results"]

    def popular(self, page: int) -> list[dict]:
        return self._get("/movie/popular", page=page)["results"]

    def trending(self, page: int = 1) -> dict:
        """Filmele în trend săptămâna aceasta: {page, results, total_pages, total_results}."""
        return self._get("/trending/movie/week", page=page)

    def search(self, query: str, page: int = 1) -> dict:
        return self._get("/search/movie", query=query, page=page, include_adult="false")

    def discover(self, filters: dict, page: int = 1) -> dict:
        """`filters` are chei TMDB exact ca în documentație (ex. „with_runtime.lte”)."""
        return self._get("/discover/movie", **{**filters, "page": page})

    def movie_details(self, tmdb_id: int) -> dict:
        """Un singur apel: detalii + trailer + platforme (append_to_response)."""
        return self._get(
            f"/movie/{tmdb_id}",
            append_to_response="videos,watch/providers",
            include_video_language="ro,en,null",
        )
