from django.contrib import admin

from .models import WatchedMovie, WatchlistItem

admin.site.register(WatchlistItem)
admin.site.register(WatchedMovie)
