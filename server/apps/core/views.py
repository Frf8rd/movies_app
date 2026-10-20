from django.db import connection
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Verificare că serverul și baza de date răspund."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})


class PingView(APIView):
    """Răspuns instant, FĂRĂ bază de date: pentru robotul de monitorizare care ține serverul treaz.
    (/health atinge DB-ul și ar ține treaz și Neon, consumându-i orele gratuite.)"""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response({"status": "pong"})
