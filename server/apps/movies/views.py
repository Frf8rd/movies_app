from django.conf import settings
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination

from apps.core.permissions import IsUserOrGuest, is_registered

from .models import Genre, Movie, StreamingProvider
from .serializers import (
    GenreSerializer,
    MovieDetailSerializer,
    MovieSummarySerializer,
    ProviderSerializer,
    with_card_relations,
)


def request_country(request) -> str:
    country = request.query_params.get("country")
    if country:
        return country.upper()[:2]
    if is_registered(request.user):
        prefs = getattr(request.user, "preferences", None)
        if prefs:
            return prefs.country
    return settings.DEFAULT_COUNTRY


class CountryContextMixin:
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["country"] = request_country(self.request)
        return ctx


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class TrendingView(CountryContextMixin, generics.ListAPIView):
    """Filme populare (pentru ecranul Acasă). `?limit=` (implicit 20, max 50)."""

    serializer_class = MovieSummarySerializer
    pagination_class = None

    def get_queryset(self):
        limit = min(_int(self.request.query_params.get("limit")) or 20, 50)
        ids = list(Movie.objects.order_by("-popularity").values_list("id", flat=True)[:limit])
        return with_card_relations(Movie.objects.filter(id__in=ids)).order_by("-popularity")


class MoviePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 50


class MovieSearchView(CountryContextMixin, generics.ListAPIView):
    """`?q=&genre=&maxRuntime=&provider=&yearFrom=&minRating=&page=` (genre/provider: id-uri separate prin virgulă)."""

    serializer_class = MovieSummarySerializer
    pagination_class = MoviePagination

    def get_queryset(self):
        p = self.request.query_params
        qs = Movie.objects.all()
        if p.get("q"):
            qs = qs.filter(title__icontains=p["q"].strip())
        genre_ids = [i for i in (_int(x) for x in p.get("genre", "").split(",")) if i]
        if genre_ids:
            qs = qs.filter(genres__id__in=genre_ids)
        provider_ids = [i for i in (_int(x) for x in p.get("provider", "").split(",")) if i]
        if provider_ids:
            qs = qs.filter(
                providers__provider_id__in=provider_ids, providers__country=request_country(self.request)
            )
        if _int(p.get("maxRuntime")):
            qs = qs.filter(runtime__isnull=False, runtime__lte=_int(p["maxRuntime"]))
        if _int(p.get("yearFrom")):
            qs = qs.filter(year__gte=_int(p["yearFrom"]))
        if _float(p.get("minRating")) is not None:
            qs = qs.filter(rating__gte=_float(p["minRating"]))
        ids = qs.order_by().values("id").distinct()
        return with_card_relations(Movie.objects.filter(id__in=ids)).order_by("-popularity", "id")


class GenreListView(generics.ListAPIView):
    serializer_class = GenreSerializer
    queryset = Genre.objects.all()
    pagination_class = None


class ProviderListView(generics.ListAPIView):
    """Platformele de streaming. `?country=RO` → doar cele care au filme în acea țară."""

    serializer_class = ProviderSerializer
    pagination_class = None

    def get_queryset(self):
        qs = StreamingProvider.objects.all()
        country = self.request.query_params.get("country")
        if country:
            qs = qs.filter(movieprovider__country=country.upper()).distinct()
        return qs


class MovieDetailView(CountryContextMixin, generics.RetrieveAPIView):
    """Detalii film. Accesibil și invitaților."""

    serializer_class = MovieDetailSerializer
    permission_classes = [IsUserOrGuest]
    queryset = with_card_relations(Movie.objects.all())
