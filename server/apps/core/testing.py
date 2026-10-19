"""Ajutoare pentru teste."""
from decimal import Decimal

from rest_framework.test import APIClient

from apps.accounts.services import create_user, tokens_for
from apps.movies.models import Genre, Movie, MovieProvider, StreamingProvider


def make_user(name="Ana", email="ana@example.com", password="parola-sigura-123"):
    return create_user(name, email, password)


def auth_client(user) -> APIClient:
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens_for(user)['access']}")
    return c


def guest_client(token) -> APIClient:
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


def make_catalog(n=15, country="RO"):
    genre = Genre.objects.create(tmdb_id=1, name="Acțiune")
    other = Genre.objects.create(tmdb_id=2, name="Comedie")
    prov = StreamingProvider.objects.create(tmdb_id=8, name="Netflix")
    movies = []
    for i in range(n):
        m = Movie.objects.create(
            tmdb_id=1000 + i, title=f"Film {i}", year=2000 + i, runtime=90 + i,
            rating=Decimal("7.0"), popularity=100 - i,
        )  # fmt: skip
        m.genres.add(genre if i % 2 == 0 else other)
        MovieProvider.objects.create(movie=m, provider=prov, country=country)
        movies.append(m)
    return {"genre": genre, "other_genre": other, "provider": prov, "movies": movies}
