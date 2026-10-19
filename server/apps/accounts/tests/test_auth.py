from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import auth_client, make_catalog, make_user


class AuthTests(TestCase):
    def setUp(self):
        self.c = APIClient()

    def test_register_login_me_refresh_logout(self):
        r = self.c.post("/api/auth/register", {"name": "Ana", "email": "Ana@Example.com", "password": "parola-sigura-123"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual(body["user"]["email"], "ana@example.com")
        self.assertEqual(body["user"]["name"], "Ana")
        self.assertNotIn("password", str(body))

        dup = self.c.post("/api/auth/register", {"name": "X", "email": "ana@example.com", "password": "alta-parola-123"}, format="json")
        self.assertEqual(dup.status_code, 409)
        self.assertEqual(dup.json()["error"]["code"], "EMAIL_EXISTS")

        bad = self.c.post("/api/auth/login", {"email": "ana@example.com", "password": "gresita"}, format="json")
        self.assertEqual(bad.status_code, 401)
        self.assertEqual(bad.json()["error"]["code"], "INVALID_CREDENTIALS")

        ok = self.c.post("/api/auth/login", {"email": "ANA@example.com", "password": "parola-sigura-123"}, format="json").json()
        self.c.credentials(HTTP_AUTHORIZATION=f"Bearer {ok['access']}")
        me = self.c.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["preferences"]["country"], "RO")

        self.c.credentials()
        new = self.c.post("/api/auth/refresh", {"refresh": ok["refresh"]}, format="json")
        self.assertEqual(new.status_code, 200)
        # refresh-ul vechi e blacklisted după rotație
        self.assertEqual(self.c.post("/api/auth/refresh", {"refresh": ok["refresh"]}, format="json").status_code, 401)

        self.c.credentials(HTTP_AUTHORIZATION=f"Bearer {new.json()['access']}")
        self.assertEqual(self.c.post("/api/auth/logout", {"refresh": new.json()["refresh"]}, format="json").status_code, 204)
        self.c.credentials()
        self.assertEqual(self.c.post("/api/auth/refresh", {"refresh": new.json()["refresh"]}, format="json").status_code, 401)

    def test_weak_password_validation_error_format(self):
        r = self.c.post("/api/auth/register", {"name": "A", "email": "a@b.com", "password": "123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("password", r.json()["error"]["details"])

    def test_unauthenticated_is_401_in_error_format(self):
        r = self.c.get("/api/auth/me")
        self.assertEqual(r.status_code, 401)
        self.assertIn("error", r.json())

    def test_change_password_and_delete_account(self):
        user = make_user()
        c = auth_client(user)
        r = c.post("/api/auth/change-password", {"oldPassword": "gresita", "newPassword": "noua-parola-456"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.post("/api/auth/change-password", {"oldPassword": "parola-sigura-123", "newPassword": "noua-parola-456"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.json())
        self.assertEqual(self.c.post("/api/auth/login", {"email": user.email, "password": "noua-parola-456"}, format="json").status_code, 200)
        self.assertEqual(c.delete("/api/me").status_code, 204)
        self.assertEqual(self.c.post("/api/auth/login", {"email": user.email, "password": "noua-parola-456"}, format="json").status_code, 401)

    def test_preferences_and_patch_me(self):
        cat = make_catalog(1)
        c = auth_client(make_user())
        r = c.put("/api/me/preferences", {"genreIds": [cat["genre"].id], "providerIds": [cat["provider"].id], "country": "md"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        prefs = r.json()["preferences"]
        self.assertEqual(prefs["genreIds"], [cat["genre"].id])
        self.assertEqual(prefs["country"], "MD")
        self.assertTrue(prefs["onboarded"])
        self.assertEqual(c.put("/api/me/preferences", {"genreIds": [99999]}, format="json").status_code, 400)
        self.assertEqual(c.patch("/api/me", {"name": "Ana M."}, format="json").json()["name"], "Ana M.")
