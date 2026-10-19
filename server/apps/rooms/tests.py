from django.test import TestCase

from apps.core.testing import auth_client, guest_client, make_catalog, make_user
from apps.library.models import WatchedMovie
from apps.rooms.models import Room
from apps.rooms.services.matching import compute_results, score_movie
from apps.rooms.services.room_code import ALPHABET, generate_room_code, normalize_code

L, S, D, V = 1, 2, -1, -99


class MatchingTests(TestCase):
    def test_unanimous_and_score(self):
        r = score_movie(1, [L, S, L], 3)
        self.assertTrue(r.unanimous)
        self.assertEqual(r.score, round(4 / 6 * 100, 1))  # 1+2+1 puncte din 6

    def test_dislike_breaks_unanimity(self):
        self.assertFalse(score_movie(1, [L, D], 2).unanimous)

    def test_veto_removes_movie(self):
        self.assertIsNone(score_movie(1, [S, V], 2))

    def test_missing_votes_not_unanimous(self):
        self.assertFalse(score_movie(1, [L], 2).unanimous)

    def test_ranking_unanimous_by_score_then_rating(self):
        movies = [(1, 7.0), (2, 8.0), (3, 6.0)]
        votes = {1: [L, L], 2: [L, L], 3: [S, S]}
        out = compute_results(movies, 2, votes)
        self.assertEqual([m.movie_id for m in out["unanimous"]], [3, 2, 1])
        self.assertEqual(out["closest"], [])

    def test_closest_compromise_when_no_unanimity(self):
        movies = [(1, 7.0), (2, 7.0), (3, 7.0)]
        votes = {1: [L, D, D], 2: [L, L, D], 3: [S, V, L]}
        out = compute_results(movies, 3, votes)
        self.assertEqual(out["unanimous"], [])
        self.assertEqual([m.movie_id for m in out["closest"]], [2, 1])  # 3 are veto
        self.assertEqual(out["closest"][0].dislikes, 1)


class RoomCodeTests(TestCase):
    def test_code_format(self):
        code = generate_room_code()
        self.assertEqual(len(code), 6)
        self.assertTrue(all(c in ALPHABET for c in code))
        for bad in "O0I1L":
            self.assertNotIn(bad, ALPHABET)

    def test_normalize(self):
        self.assertEqual(normalize_code(" k7f-29q "), "K7F29Q")


class RoomFlowTests(TestCase):
    def setUp(self):
        self.cat = make_catalog(15)
        self.host = make_user("Ana", "ana@example.com")
        self.friend = make_user("Bob", "bob@example.com")
        self.h = auth_client(self.host)
        self.b = auth_client(self.friend)

    def _create_room(self, **extra):
        body = {"title": "Vineri seara", "genreIds": [], "providerIds": [self.cat["provider"].id], "deckSize": 10, **extra}
        r = self.h.post("/api/rooms", body, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def _vote_all(self, client, room_id, choices):
        deck = client.get(f"/api/rooms/{room_id}/deck").json()["deck"]
        last = None
        for item, choice in zip(deck, choices):
            last = client.post(f"/api/rooms/{room_id}/votes", {"movieId": item["movie"]["id"], "choice": choice}, format="json")
            self.assertEqual(last.status_code, 201, last.content)
        return deck, last.json()

    def test_full_flow_with_guest(self):
        room = self._create_room()
        self.assertEqual(len(room["code"]), 6)
        self.assertTrue(room["isHost"])

        # prieten cu cont + invitat fără cont
        self.assertEqual(self.b.post("/api/rooms/join", {"code": room["code"].lower()}, format="json").status_code, 201)
        anon = guest_client("")  # fără token
        anon.credentials()
        r = anon.post("/api/rooms/join", {"code": room["code"], "nickname": "Invitat"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        g = guest_client(r.json()["guestToken"])

        # invitatul nu are voie la rutele pentru conturi
        self.assertEqual(g.get("/api/me/watchlist").status_code, 403)
        self.assertEqual(g.get("/api/auth/me").status_code, 403)
        # ... dar poate vedea camera lui
        self.assertEqual(g.get(f"/api/rooms/{room['id']}").status_code, 200)

        # doar gazda pornește votul
        self.assertEqual(self.b.post(f"/api/rooms/{room['id']}/start").status_code, 403)
        self.assertEqual(self.h.post(f"/api/rooms/{room['id']}/start").status_code, 200)
        # nu te mai poți alătura după start
        late = make_user("Late", "late@example.com")
        self.assertEqual(auth_client(late).post("/api/rooms/join", {"code": room["code"]}, format="json").status_code, 409)

        # rezultatele sunt blocate în timpul votului
        self.assertEqual(self.h.get(f"/api/rooms/{room['id']}/results").status_code, 403)

        # toți votează LIKE pe tot, mai puțin primul film (dislike de la invitat)
        rid = room["id"]
        deck = self.h.get(f"/api/rooms/{rid}/deck").json()["deck"]
        first_id = deck[0]["movie"]["id"]
        for c in (self.h, self.b):
            self._vote_all(c, rid, ["LIKE"] * 10)
        # invitatul: dislike la primul
        self._vote_all(g, rid, ["DISLIKE"] + ["LIKE"] * 9)

        prog = self.h.get(f"/api/rooms/{rid}/progress").json()
        self.assertEqual(prog["finishedCount"], 3)
        self.assertEqual(prog["roomStatus"], "RESULTS")
        self.assertNotIn("choice", str(prog))  # fără voturi

        res = self.h.get(f"/api/rooms/{rid}/results").json()
        self.assertTrue(res["hasUnanimous"])
        self.assertEqual(len(res["unanimous"]), 9)
        self.assertNotIn(first_id, [i["movie"]["id"] for i in res["unanimous"]])
        self.assertEqual(res["unanimous"][0]["score"], 50.0)  # 3 like-uri = 3 puncte din 6
        self.assertNotIn("nickname", str(res))  # nu se vede cine a votat

        # alegerea finală
        pick = res["unanimous"][0]["movie"]["id"]
        self.assertEqual(self.b.post(f"/api/rooms/{rid}/pick", {"movieId": pick}, format="json").status_code, 403)
        self.assertEqual(self.h.post(f"/api/rooms/{rid}/pick", {"movieId": pick}, format="json").status_code, 200)
        self.assertEqual(Room.objects.get(pk=rid).status, "CLOSED")
        self.assertEqual(WatchedMovie.objects.filter(room_id=rid).count(), 2)  # gazda + prietenul (invitatul nu are cont)
        self.assertEqual(self.h.get("/api/me/history").json()[0]["movie"]["id"], pick)

    def test_double_vote_and_veto_rules(self):
        room = self._create_room()
        rid = room["id"]
        self.b.post("/api/rooms/join", {"code": room["code"]}, format="json")
        self.h.post(f"/api/rooms/{rid}/start")
        deck = self.h.get(f"/api/rooms/{rid}/deck").json()["deck"]
        m0, m1 = deck[0]["movie"]["id"], deck[1]["movie"]["id"]
        self.assertEqual(self.h.post(f"/api/rooms/{rid}/votes", {"movieId": m0, "choice": "LIKE"}, format="json").status_code, 201)
        dup = self.h.post(f"/api/rooms/{rid}/votes", {"movieId": m0, "choice": "DISLIKE"}, format="json")
        self.assertEqual(dup.status_code, 409)
        self.assertEqual(dup.json()["error"]["code"], "ALREADY_VOTED")
        self.assertEqual(self.h.post(f"/api/rooms/{rid}/votes", {"movieId": m1, "choice": "VETO"}, format="json").status_code, 201)
        m2 = deck[2]["movie"]["id"]
        again = self.h.post(f"/api/rooms/{rid}/votes", {"movieId": m2, "choice": "VETO"}, format="json")
        self.assertEqual(again.json()["error"]["code"], "VETO_USED")
        # film din afara pachetului
        self.assertEqual(self.h.post(f"/api/rooms/{rid}/votes", {"movieId": 999999, "choice": "LIKE"}, format="json").status_code, 404)

    def test_deck_hides_other_votes(self):
        room = self._create_room()
        rid = room["id"]
        self.b.post("/api/rooms/join", {"code": room["code"]}, format="json")
        self.h.post(f"/api/rooms/{rid}/start")
        deck_b = self.b.get(f"/api/rooms/{rid}/deck").json()["deck"]
        self.h.post(f"/api/rooms/{rid}/votes", {"movieId": deck_b[0]["movie"]["id"], "choice": "SUPER"}, format="json")
        after = self.b.get(f"/api/rooms/{rid}/deck").json()
        self.assertFalse(after["deck"][0]["voted"])
        self.assertIsNone(after["deck"][0]["myChoice"])
        # aceeași ordine pentru toți
        self.assertEqual([d["movie"]["id"] for d in deck_b], [d["movie"]["id"] for d in self.h.get(f"/api/rooms/{rid}/deck").json()["deck"]])

    def test_deck_too_small_422(self):
        room = self._create_room(maxRuntime=60)  # niciun film nu e atât de scurt
        r = self.h.post(f"/api/rooms/{room['id']}/start")
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["error"]["code"], "DECK_TOO_SMALL")

    def test_close_voting_by_host_and_outsiders_blocked(self):
        room = self._create_room()
        rid = room["id"]
        self.h.post(f"/api/rooms/{rid}/start")
        outsider = auth_client(self.friend)
        self.assertEqual(outsider.get(f"/api/rooms/{rid}").status_code, 403)  # nu e membru
        self.assertEqual(self.h.post(f"/api/rooms/{rid}/close-voting").status_code, 200)
        res = self.h.get(f"/api/rooms/{rid}/results").json()
        self.assertFalse(res["hasUnanimous"])  # nimeni n-a votat → nimic unanim
        self.assertEqual(len(res["closest"]), 10)

    def test_wrong_code_and_guest_needs_nickname(self):
        anon = guest_client("")
        anon.credentials()
        self.assertEqual(anon.post("/api/rooms/join", {"code": "ZZZZZZ", "nickname": "X1"}, format="json").status_code, 404)
        room = self._create_room()
        r = anon.post("/api/rooms/join", {"code": room["code"]}, format="json")
        self.assertEqual(r.json()["error"]["code"], "NICKNAME_REQUIRED")

    def test_list_rooms_and_delete(self):
        room = self._create_room()
        self.assertEqual(len(self.h.get("/api/rooms?status=active").json()), 1)
        self.assertEqual(len(self.h.get("/api/rooms?status=closed").json()), 0)
        self.assertEqual(self.b.delete(f"/api/rooms/{room['id']}").status_code, 403)
        self.assertEqual(self.h.delete(f"/api/rooms/{room['id']}").status_code, 204)
