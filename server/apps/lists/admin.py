from django.contrib import admin

from .models import MovieList, MovieListItem

admin.site.register(MovieList)
admin.site.register(MovieListItem)
