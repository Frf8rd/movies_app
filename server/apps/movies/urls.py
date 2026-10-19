from django.urls import path

from . import views

urlpatterns = [
    path("movies/trending", views.TrendingView.as_view()),
    path("movies/search", views.MovieSearchView.as_view()),
    path("movies/genres", views.GenreListView.as_view()),
    path("movies/providers", views.ProviderListView.as_view()),
    path("movies/<int:pk>", views.MovieDetailView.as_view()),
]
