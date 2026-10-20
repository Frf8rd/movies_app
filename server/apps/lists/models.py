from django.conf import settings
from django.db import models


class MovieList(models.Model):
    class Category(models.TextChoices):
        FRIENDS = "FRIENDS"
        FAMILY = "FAMILY"
        COUPLE = "COUPLE"
        OTHER = "OTHER"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lists")
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.OTHER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class MovieListItem(models.Model):
    movie_list = models.ForeignKey(MovieList, on_delete=models.CASCADE, related_name="items")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("movie_list", "movie")
