from django.urls import path

from . import views

urlpatterns = [
    path("rooms", views.RoomListCreateView.as_view()),
    path("rooms/join", views.RoomJoinView.as_view()),
    path("rooms/<int:pk>", views.RoomDetailView.as_view()),
    path("rooms/<int:pk>/leave", views.RoomLeaveView.as_view()),
    path("rooms/<int:pk>/start", views.RoomStartView.as_view()),
    path("rooms/<int:pk>/deck", views.RoomDeckView.as_view()),
    path("rooms/<int:pk>/votes", views.VoteCreateView.as_view()),
    path("rooms/<int:pk>/progress", views.RoomProgressView.as_view()),
    path("rooms/<int:pk>/results", views.RoomResultsView.as_view()),
    path("rooms/<int:pk>/close-voting", views.RoomCloseVotingView.as_view()),
    path("rooms/<int:pk>/pick", views.RoomPickView.as_view()),
]
