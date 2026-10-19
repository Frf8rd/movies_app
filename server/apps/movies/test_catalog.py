"""Teste pentru catalogul live (TMDB mockat): nimic nu se salvează în DB până nu e folosit filmul."""
from unittest.mock import patch

import requests
from django.core.cache import cache
from django.test import TestCase, override_settings

from apps.core.testing import auth_client, make_catalog, make_user
from apps.movies.models import Movie
from apps.movies.services.tmdb_client import TMDBError


def _item(tmdb_id):
    return {
        "id": tmdb_id, "title": f"Film {tmdb_id}", "release_date": "2020-05-01", "vote_average": 7.5,
        "poster_path": "/p.jpg", "genre_ids": [1], "popularity": 50, "adult": False,
    }  # fmt: skip


class FakeTMDB:
    """Înlocuiește TMDBClient: răspunsuri fixe, fără rețea."""

    def __init__(self, total_results=600, fail=False, details_status=None):
        self.total_results = total_results
        self.fail = fail
        self.details_status = details_status
        self.discover_calls = []

    def _check(self):
        if self.fail:
            raise TMDBError("TMDB picat")

    def _page(self, page, total_pages=30):
        results = [_item(5000 + (page - 1) * 20 + i) for i in range(20)][: self.total_results]
        return {"page": page, "results": results, "total_pages": total_pages, "total_results": self.total_results}

    def genres(self):
        return [{"id": 1, "name": "Acțiune"}]

    def trending(self, page=1):
        self._check()
        return self._page(page, total_pages=5)

    def search(self, query, page=1):
        self._check()
        return {**self._page(page, total_pages=5), "total_results": 100}

    def discover(self, filters, page=1):
        self._check()
        self.discover_calls.append((filters, page))
        return self._page(page)

    def movie_details(self, tmdb_id):
        self._check()
        if self.details_status:
            resp = requests.Response()
            resp.status_code = self.details_status
            raise requests.HTTPError(response=resp)
        return {
            "id": tmdb_id, "title": f"Film {tmdb_id}", "overview": "…", "release_date": "2020-05-01", "runtime": 100,
            "vote_average": 7.5, "poster_path": "/p.jpg", "popularity": 50,
            "genres": [{"id": 1, "name": "Acțiune"}],
            "videos": {"results": [{"site": "YouTube", "type": "Trailer", "key": "abc"}]},
            "watch/providers": {"results": {"RO": {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.png"}]}}},
        }  # fmt: skip


class LiveBase(TestCase):
    def use_fake(self, **kwargs):
        self.fake = FakeTMDB(**kwargs)
        patcher = patch("apps.movies.services.catalog.get_client", return_value=self.fake)
        patcher.start()
        self.addCleanup(patcher.stop)

    def setUp(self):
        cache.clear()  # fără rezultate rămase din alt test (dacă nu rulezi cu settings.test)
        self.addCleanup(cache.clear)
        self.cat = make_catalog(0)  # doar genurile (tmdb 1, 2) și platforma Netflix (tmdb 8), fără filme
        self.use_fake()
        self.c = auth_client(make_user())


@override_settings(TMDB_API_KEY="test-key")
class LiveCatalogTests(LiveBase):
    def test_trending_comes_from_tmdb_and_saves_nothing(self):
        r = self.c.get("/api/movies/trending?limit=25").json()
        self.assertEqual(len(r), 25)
        self.assertEqual(r[0]["id"], r[0]["tmdbId"])
        self.assertEqual(r[0]["genres"], ["Acțiune"])
        self.assertEqual(Movie.objects.count(), 0)

    def test_search_paginates_like_before(self):
        r = self.c.get("/api/movies/search?q=film&page=2").json()
        self.assertEqual((r["count"], len(r["results"])), (100, 20))
        self.assertIn("page=3", r["next"])
        self.assertIn("page=1", r["previous"])
        self.assertEqual(Movie.objects.count(), 0)

    def test_search_filters_are_translated_for_tmdb(self):
        genre = self.cat["genre"]
        self.c.get(f"/api/movies/search?genre={genre.id}&maxRuntime=100&yearFrom=2010&minRating=7")
        filters = self.fake.discover_calls[-1][0]
        self.assertEqual(filters["with_genres"], str(genre.tmdb_id))  # id intern -> id TMDB
        self.assertEqual(filters["with_runtime.lte"], 100)
        self.assertEqual(filters["primary_release_date.gte"], "2010-01-01")
        self.assertEqual(filters["vote_average.gte"], 7.0)

    def test_detail_is_live_and_not_saved(self):
        r = self.c.get("/api/movies/5003")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual((body["id"], body["tmdbId"], body["runtime"]), (5003, 5003, 100))
        self.assertEqual(body["trailerUrl"], "https://www.youtube.com/watch?v=abc")
        self.assertEqual(body["providers"][0]["name"], "Netflix")
        self.assertEqual(Movie.objects.count(), 0)

    def test_detail_unknown_movie_404(self):
        self.use_fake(details_status=404)
        self.assertEqual(self.c.get("/api/movies/1").status_code, 404)

    def test_tmdb_down_gives_502_or_falls_back_to_saved_movie(self):
        self.use_fake(fail=True)
        r = self.c.get("/api/movies/trending")
        self.assertEqual(r.status_code, 502)
        self.assertEqual(r.json()["error"]["code"], "TMDB_UNAVAILABLE")
        self.assertEqual(self.c.get("/api/movies/5003").status_code, 502)
        saved = Movie.objects.create(tmdb_id=1000, title="Salvat", year=2000, runtime=90)  # deja în DB -> merge fără TMDB
        self.assertEqual(self.c.get(f"/api/movies/{saved.tmdb_id}").status_code, 200)

    def test_watchlist_and_lists_save_the_movie_when_used(self):
        self.assertEqual(Movie.objects.count(), 0)
        r = self.c.post("/api/me/watchlist", {"movieId": 5003}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["movie"]["id"], 5003)
        self.assertEqual(Movie.objects.filter(tmdb_id=5003).count(), 1)

        lid = self.c.post("/api/lists", {"name": "A"}, format="json").json()["id"]
        self.assertEqual(self.c.post(f"/api/lists/{lid}/items", {"movieId": 5004}, format="json").status_code, 201)
        self.assertEqual(Movie.objects.count(), 2)
        self.assertEqual(self.c.delete(f"/api/lists/{lid}/items/5004").status_code, 204)
        self.assertEqual(self.c.delete("/api/me/watchlist/5003").status_code, 204)

    def test_watchlist_unknown_movie_404(self):
        self.use_fake(details_status=404)
        self.assertEqual(self.c.post("/api/me/watchlist", {"movieId": 1}, format="json").status_code, 404)


@override_settings(TMDB_API_KEY="test-key")
class LiveDeckTests(LiveBase):
    def _room(self, **extra):
        body = {"title": "Vineri", "deckSize": 10, "genreIds": [self.cat["genre"].id], "providerIds": [self.cat["provider"].id], "maxRuntime": 120, **extra}
        r = self.c.post("/api/rooms", body, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()["id"]

    def test_start_builds_deck_from_tmdb_and_saves_only_the_deck(self):
        rid = self._room()
        self.assertEqual(Movie.objects.count(), 0)
        self.assertEqual(self.c.post(f"/api/rooms/{rid}/start").status_code, 200)
        self.assertEqual(Movie.objects.count(), 10)  # doar filmele din pachet

        filters, _page = self.fake.discover_calls[0]
        cat = self.cat
        self.assertEqual(filters["with_genres"], str(cat["genre"].tmdb_id))
        self.assertEqual(filters["with_watch_providers"], str(cat["provider"].tmdb_id))
        self.assertEqual((filters["watch_region"], filters["with_runtime.lte"]), ("RO", 120))

        deck = self.c.get(f"/api/rooms/{rid}/deck").json()["deck"]
        self.assertEqual(len(deck), 10)
        mid = deck[0]["movie"]["id"]  # id TMDB
        r = self.c.post(f"/api/rooms/{rid}/votes", {"movieId": mid, "choice": "LIKE"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["movieId"], mid)

    def test_too_few_results_gives_422(self):
        self.use_fake(total_results=3)
        r = self.c.post(f"/api/rooms/{self._room()}/start")
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (422, "DECK_TOO_SMALL"))

    def test_tmdb_down_on_start_gives_502_and_room_stays_in_lobby(self):
        self.use_fake(fail=True)
        rid = self._room()
        self.assertEqual(self.c.post(f"/api/rooms/{rid}/start").status_code, 502)
        self.assertEqual(self.c.get(f"/api/rooms/{rid}").json()["status"], "LOBBY")
