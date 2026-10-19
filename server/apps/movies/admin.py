from django.contrib import admin

from .models import Genre, Movie, MovieProvider, StreamingProvider

admin.site.register(Genre)
admin.site.register(StreamingProvider)
admin.site.register(MovieProvider)


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("title", "year", "runtime", "rating", "popularity")
    search_fields = ("title",)
