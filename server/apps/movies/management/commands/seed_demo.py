"""Date de test fără TMDB: util cât timp nu ai încă o cheie API sau pentru a testa rapid fluxul camerei."""
import random
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.movies.models import Genre, Movie, MovieProvider, StreamingProvider

GENRES = ["Acțiune", "Comedie", "Dramă", "SF", "Thriller", "Animație", "Horror", "Romantic", "Aventură", "Crimă"]
PROVIDERS = ["Netflix", "HBO Max", "Prime Video", "Disney+", "SkyShowtime"]


class Command(BaseCommand):
    help = "Creează genuri, platforme și filme fictive (demo)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=60)
        parser.add_argument("--country", default="RO")

    def handle(self, *args, **opts):
        rnd = random.Random(42)
        genres = [Genre.objects.get_or_create(tmdb_id=9000 + i, defaults={"name": n})[0] for i, n in enumerate(GENRES)]
        providers = [
            StreamingProvider.objects.get_or_create(tmdb_id=9500 + i, defaults={"name": n})[0]
            for i, n in enumerate(PROVIDERS)
        ]
        for i in range(opts["count"]):
            movie, _ = Movie.objects.update_or_create(
                tmdb_id=900000 + i,
                defaults={
                    "title": f"Film demo {i + 1}",
                    "overview": "Film fictiv pentru testare.",
                    "year": rnd.randint(1995, 2025),
                    "runtime": rnd.randint(80, 170),
                    "rating": Decimal(str(round(rnd.uniform(5, 9), 1))),
                    "popularity": rnd.uniform(1, 500),
                },
            )
            movie.genres.set(rnd.sample(genres, rnd.randint(1, 3)))
            for p in rnd.sample(providers, rnd.randint(1, 3)):
                MovieProvider.objects.get_or_create(movie=movie, provider=p, country=opts["country"].upper())
        self.stdout.write(self.style.SUCCESS(f"Gata: {opts['count']} filme demo."))
