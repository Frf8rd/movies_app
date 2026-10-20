"""GDPR: șterge voturile camerelor vechi (și camerele închise foarte vechi). Rulează-l zilnic (cron)."""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.rooms.models import Room, Vote


class Command(BaseCommand):
    help = "Șterge voturile din camerele mai vechi de VOTE_RETENTION_DAYS zile."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=settings.VOTE_RETENTION_DAYS)

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(days=opts["days"])
        votes, _ = Vote.objects.filter(room__created_at__lt=cutoff).delete()
        rooms, _ = Room.objects.filter(created_at__lt=cutoff, status=Room.Status.CLOSED).delete()
        self.stdout.write(self.style.SUCCESS(f"Șterse: {votes} înregistrări de voturi, {rooms} camere vechi."))
