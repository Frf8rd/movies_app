from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    avatar_url = models.URLField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    @property
    def display_name(self) -> str:
        return self.first_name or self.username


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    favorite_genres = models.ManyToManyField("movies.Genre", blank=True)
    providers = models.ManyToManyField("movies.StreamingProvider", blank=True)
    country = models.CharField(max_length=2, default="RO")
    onboarded = models.BooleanField(default=False)
