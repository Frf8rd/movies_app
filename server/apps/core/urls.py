from django.urls import path

from .views import HealthView, PingView

urlpatterns = [path("health", HealthView.as_view()), path("ping", PingView.as_view())]
