"""Setări comune. Valorile sensibile vin din variabile de mediu / fișierul .env."""
from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")  # dacă fișierul nu există, nu se întâmplă nimic

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # terți
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # aplicațiile noastre
    "apps.core",
    "apps.accounts",
    "apps.movies",
    "apps.rooms",
    "apps.lists",
    "apps.library",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "reelmatch.urls"
WSGI_APPLICATION = "reelmatch.wsgi.application"
ASGI_APPLICATION = "reelmatch.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# --- Baza de date (Neon PostgreSQL) -------------------------------------------------
DATABASE_URL = env("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
_is_postgres = DATABASE_URL.startswith(("postgres://", "postgresql://"))
DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=0,  # Neon + pooler: nu păstra conexiuni persistente
        ssl_require=_is_postgres and "localhost" not in DATABASE_URL,
    )
}
if "-pooler" in DATABASE_URL:
    # PgBouncer (transaction mode) nu suportă cursoare pe server
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
APPEND_SLASH = False  # rutele API nu au slash la final

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# --- CORS ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# --- Django REST Framework ----------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.rooms.authentication.GuestJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # implicit: doar utilizatori cu cont. Rutele de cameră permit explicit și invitații.
    "DEFAULT_PERMISSION_CLASSES": ["apps.core.permissions.IsRegisteredUser"],
    "DEFAULT_RENDERER_CLASSES": ["apps.core.camel.CamelCaseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["apps.core.camel.CamelCaseJSONParser"],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("THROTTLE_AUTH", default="20/min"),
        "join": env("THROTTLE_JOIN", default="15/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=14)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "ReelMatch API",
    "DESCRIPTION": "Backend pentru ReelMatch. Câmpurile JSON sunt în camelCase.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "POSTPROCESSING_HOOKS": ["apps.core.camel.camelize_schema_hook"],
}

# --- Setări ReelMatch ---------------------------------------------------------------
GUEST_TOKEN_LIFETIME = timedelta(hours=env.int("GUEST_TOKEN_HOURS", default=24))
ROOM_MIN_DECK_SIZE = env.int("ROOM_MIN_DECK_SIZE", default=10)
ROOM_MAX_MEMBERS = env.int("ROOM_MAX_MEMBERS", default=12)
DEFAULT_COUNTRY = env("DEFAULT_COUNTRY", default="RO")
VOTE_RETENTION_DAYS = env.int("VOTE_RETENTION_DAYS", default=90)  # GDPR: vezi comanda purge_old_rooms

TMDB_API_KEY = env("TMDB_API_KEY", default="")
TMDB_LANGUAGE = env("TMDB_LANGUAGE", default="ro-RO")
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
