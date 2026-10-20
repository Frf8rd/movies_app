from django.test import TestCase

from apps.core.testing import auth_client, make_catalog, make_user
from apps.movies.models import Movie
from apps.movies.services.movie_sync import save_movie, sync_genres, sync_providers


class FakeClient:
    def genres(self):
        return [{"id": 28, "name": "Acțiune"}]

    def providers(self, country):
        return [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.png"}]


DETAILS = {
    "id": 603, "title": "Matrix", "overview": "…", "release_date": "1999-03-30", "runtime": 136,
    "vote_average": 8.2345, "poster_path": "/p.jpg", "popularity": 80.5,
    "genres": [{"id": 28, "name": "Acțiune"}, {"id": 878, "name": "SF"}],
    "videos": {"results": [{"site": "YouTube", "type": "Clip", "key": "clip"}, {"site": "YouTube", "type": "Trailer", "key": "abc123"}]},
    "watch/providers": {"results": {"RO": {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.png"}], "rent": [{"provider_id": 2, "provider_name": "Apple"}]}}},
}  # fmt: skip


class SyncTests(TestCase):
    def test_sync_and_save_movie_is_idempotent(self):
        self.assertEqual(sync_genres(FakeClient()), 1)
        self.assertEqual(sync_providers(FakeClient(), "RO"), 1)
        for _ in range(2):
            m = save_movie(DETAILS, "RO")
        self.assertEqual(Movie.objects.count(), 1)
        self.assertEqual((m.title, m.year, m.runtime, str(m.rating), m.trailer_key), ("Matrix", 1999, 136, "8.2", "abc123"))
        self.assertEqual(m.genres.count(), 2)
        self.assertEqual([p.provider.name for p in m.providers.all()], ["Netflix"])  # doar abonament, nu „rent”


class MovieApiTests(TestCase):
    def setUp(self):
        self.cat = make_catalog(25)
        self.c = auth_client(make_user())

    def test_trending_genres_providers(self):
        t = self.c.get("/api/movies/trending").json()
        self.assertEqual(len(t), 20)
        self.assertEqual(t[0]["title"], "Film 0")
        self.assertEqual(t[0]["providers"][0]["name"], "Netflix")
        self.assertEqual(len(self.c.get("/api/movies/genres").json()), 2)
        self.assertEqual(len(self.c.get("/api/movies/providers?country=RO").json()), 1)
        self.assertEqual(len(self.c.get("/api/movies/providers?country=FR").json()), 0)

    def test_search_filters_and_pagination(self):
        r = self.c.get("/api/movies/search?maxRuntime=95&genre=%d" % self.cat["genre"].id).json()
        self.assertEqual({m["title"] for m in r["results"]}, {"Film 0", "Film 2", "Film 4"})
        page = self.c.get("/api/movies/search").json()
        self.assertEqual((page["count"], len(page["results"])), (25, 20))
        self.assertEqual(self.c.get("/api/movies/search?q=film 7").json()["count"], 1)

    def test_detail(self):
        m = Movie.objects.first()
        r = self.c.get(f"/api/movies/{m.tmdb_id}")  # id public = id TMDB
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["id"], m.tmdb_id)
        self.assertIn("trailerUrl", r.json())
        self.assertEqual(self.c.get("/api/movies/999999").status_code, 404)
