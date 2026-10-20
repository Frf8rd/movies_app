from django.apps import AppConfig


class RoomsConfig(AppConfig):
    name = "apps.rooms"
    label = "rooms"

    def ready(self):
        from . import schema  # noqa: F401  (înregistrează schema Swagger pentru tokenul de invitat)
