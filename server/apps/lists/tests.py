from django.test import TestCase

from apps.core.testing import auth_client, make_catalog, make_user


class ListsAndLibraryTests(TestCase):
    def setUp(self):
        self.cat = make_catalog(3)
        self.c = auth_client(make_user())
        self.mid = self.cat["movies"][0].tmdb_id  # id public = id TMDB

    def test_list_crud_and_items(self):
        r = self.c.post("/api/lists", {"name": "Cu prietenii", "category": "FRIENDS"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        lid = r.json()["id"]
        self.assertEqual(self.c.post(f"/api/lists/{lid}/items", {"movieId": self.mid}, format="json").status_code, 201)
        self.assertEqual(self.c.post(f"/api/lists/{lid}/items", {"movieId": self.mid}, format="json").status_code, 409)
        detail = self.c.get(f"/api/lists/{lid}").json()
        self.assertEqual(detail["itemCount"], 1)
        self.assertEqual(detail["movies"][0]["id"], self.mid)
        self.assertEqual(self.c.patch(f"/api/lists/{lid}", {"name": "Familie", "category": "FAMILY"}, format="json").json()["name"], "Familie")
        self.assertEqual(self.c.delete(f"/api/lists/{lid}/items/{self.mid}").status_code, 204)
        self.assertEqual(self.c.delete(f"/api/lists/{lid}").status_code, 204)

    def test_lists_are_private(self):
        lid = self.c.post("/api/lists", {"name": "A"}, format="json").json()["id"]
        other = auth_client(make_user("Bob", "bob@example.com"))
        self.assertEqual(other.get(f"/api/lists/{lid}").status_code, 404)
        self.assertEqual(other.get("/api/lists").json(), [])

    def test_watchlist_history_stats(self):
        self.assertEqual(self.c.post("/api/me/watchlist", {"movieId": self.mid}, format="json").status_code, 201)
        self.assertEqual(self.c.post("/api/me/watchlist", {"movieId": self.mid}, format="json").status_code, 409)
        self.assertEqual(len(self.c.get("/api/me/watchlist").json()), 1)
        self.assertEqual(self.c.delete(f"/api/me/watchlist/{self.mid}").status_code, 204)
        self.assertEqual(self.c.delete(f"/api/me/watchlist/{self.mid}").status_code, 404)
        stats = self.c.get("/api/me/stats").json()
        self.assertEqual(stats["watchedCount"], 0)
        self.assertIsNone(stats["favoriteGenre"])

    def test_history_rating_validation(self):
        from apps.library.models import WatchedMovie
        from apps.accounts.models import User

        user = User.objects.get(email="ana@example.com")
        w = WatchedMovie.objects.create(user=user, movie=self.cat["movies"][0])
        self.assertEqual(self.c.patch(f"/api/me/history/{w.id}", {"myRating": 11}, format="json").status_code, 400)
        self.assertEqual(self.c.patch(f"/api/me/history/{w.id}", {"myRating": 9}, format="json").json()["myRating"], 9)
        self.assertEqual(self.c.get("/api/me/stats").json()["favoriteGenre"], "Acțiune")
