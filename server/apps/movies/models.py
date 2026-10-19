from django.db import models


class Genre(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=60)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class StreamingProvider(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=80)
    logo_path = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Movie(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    title = models.CharField(max_length=255)
    overview = models.TextField(blank=True)
    year = models.PositiveSmallIntegerField(null=True, db_index=True)
    runtime = models.PositiveSmallIntegerField(null=True, db_index=True)  # minute
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    poster_path = models.CharField(max_length=200, blank=True)
    trailer_key = models.CharField(max_length=40, blank=True)  # YouTube
    popularity = models.FloatField(default=0, db_index=True)
    genres = models.ManyToManyField(Genre, related_name="movies", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-popularity"]

    def __str__(self):
        return f"{self.title} ({self.year})"


class MovieProvider(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="providers")
    provider = models.ForeignKey(StreamingProvider, on_delete=models.CASCADE)
    country = models.CharField(max_length=2)

    class Meta:
        unique_together = ("movie", "provider", "country")
