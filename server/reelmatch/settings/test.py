"""Setări pentru teste: SQLite în memorie, rapid, fără throttling."""
from .base import *  # noqa: F401,F403

DEBUG = False
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"auth": "10000/min", "join": "10000/min"}}  # noqa: F405

# Testele nu vorbesc niciodată cu TMDB (cheia din .env ar fi altfel citită) și nu folosesc cache.
TMDB_API_KEY = ""
CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}
