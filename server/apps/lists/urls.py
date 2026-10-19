from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import MovieListItemView, MovieListViewSet

router = SimpleRouter(trailing_slash=False)
router.register("lists", MovieListViewSet, basename="lists")

urlpatterns = [
    path("lists/<int:pk>/items", MovieListItemView.as_view()),
    path("lists/<int:pk>/items/<int:movie_id>", MovieListItemView.as_view()),
] + router.urls
