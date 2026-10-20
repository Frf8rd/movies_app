from django.conf import settings
from django.db import models


class WatchlistItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlist")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "movie")
        ordering = ["-added_at"]


class WatchedMovie(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="history")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE)
    room = models.ForeignKey("rooms.Room", null=True, blank=True, on_delete=models.SET_NULL)
    watched_on = models.DateField(auto_now_add=True)
    my_rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-10

    class Meta:
        ordering = ["-watched_on", "-id"]
