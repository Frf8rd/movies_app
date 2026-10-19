from django.conf import settings
from django.db import models


class Room(models.Model):
    class Status(models.TextChoices):
        LOBBY = "LOBBY"
        VOTING = "VOTING"
        RESULTS = "RESULTS"
        CLOSED = "CLOSED"

    code = models.CharField(max_length=6, unique=True, db_index=True)
    title = models.CharField(max_length=100)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hosted_rooms")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LOBBY)
    # filtre
    genres = models.ManyToManyField("movies.Genre", blank=True)
    providers = models.ManyToManyField("movies.StreamingProvider", blank=True)
    max_runtime = models.PositiveSmallIntegerField(null=True, blank=True)
    year_from = models.PositiveSmallIntegerField(null=True, blank=True)
    min_rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    source_list = models.ForeignKey("lists.MovieList", null=True, blank=True, on_delete=models.SET_NULL)
    deck_size = models.PositiveSmallIntegerField(default=30)
    picked_movie = models.ForeignKey("movies.Movie", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} [{self.code}]"


class RoomMember(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=40)  # pentru invitați și afișare
    is_guest = models.BooleanField(default=False)
    finished_voting = models.BooleanField(default=False)
    veto_used = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["room", "user"], condition=models.Q(user__isnull=False), name="uniq_user_per_room"
            ),
        ]


class RoomMovie(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="deck")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE)
    position = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("room", "movie")
        ordering = ["position"]


class Vote(models.Model):
    class Choice(models.IntegerChoices):
        DISLIKE = -1
        LIKE = 1
        SUPER = 2
        VETO = -99

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="votes")
    member = models.ForeignKey(RoomMember, on_delete=models.CASCADE, related_name="votes")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE)
    choice = models.SmallIntegerField(choices=Choice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("member", "movie")  # un singur vot per participant/film
        indexes = [models.Index(fields=["room", "movie"])]
