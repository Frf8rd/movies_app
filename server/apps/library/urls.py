from django.urls import path

from . import views

urlpatterns = [
    path("me/watchlist", views.WatchlistView.as_view()),
    path("me/watchlist/<int:movie_id>", views.WatchlistDeleteView.as_view()),
    path("me/history", views.HistoryView.as_view()),
    path("me/history/<int:pk>", views.HistoryDetailView.as_view()),
    path("me/stats", views.StatsView.as_view()),
]
