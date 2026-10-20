from django.core.management.base import BaseCommand

from apps.movies.services.movie_sync import sync_genres, sync_popular_movies, sync_providers
from apps.movies.services.tmdb_client import TMDBClient


class Command(BaseCommand):
    help = "Populează catalogul din TMDB: genuri, platforme și filme populare."

    def add_arguments(self, parser):
        parser.add_argument("--genres", action="store_true", help="sincronizează genurile")
        parser.add_argument("--providers", action="store_true", help="sincronizează platformele")
        parser.add_argument("--country", default="RO", help="țara pentru platforme (implicit RO)")
        parser.add_argument("--pages", type=int, default=0, help="câte pagini de filme populare (20 filme/pagină)")

    def handle(self, *args, **opts):
        client = TMDBClient()
        country = opts["country"].upper()
        if opts["genres"]:
            self.stdout.write(f"Genuri: {sync_genres(client)}")
        if opts["providers"]:
            self.stdout.write(f"Platforme ({country}): {sync_providers(client, country)}")
        if opts["pages"]:
            self.stdout.write(f"Aduc {opts['pages']} pagini de filme populare…")
            n = sync_popular_movies(client, country, opts["pages"], log=self.stdout.write)
            self.stdout.write(self.style.SUCCESS(f"Gata: {n} filme salvate/actualizate."))
