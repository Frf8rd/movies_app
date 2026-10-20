from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.core.exceptions import ApiError
from apps.core.permissions import IsUserOrGuest, is_registered

from .models import Genre, Movie, StreamingProvider
from .serializers import (
    GenreSerializer,
    MovieDetailSerializer,
    MovieSummarySerializer,
    ProviderSerializer,
    with_card_relations,
)
from .services import catalog


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
    """
    Filme în trend (ecranul Acasă). `?limit=` (implicit 20, max 50).
    Cu cheie TMDB: vin direct de la TMDB (cache 10 min), fără să se salveze în DB.
    Fără cheie (mod demo): din filmele din DB.
    """

    serializer_class = MovieSummarySerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        if catalog.tmdb_enabled():
            limit = min(_int(request.query_params.get("limit")) or 20, 50)
            return Response(catalog.trending(limit))
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        limit = min(_int(self.request.query_params.get("limit")) or 20, 50)
        ids = list(Movie.objects.order_by("-popularity").values_list("id", flat=True)[:limit])
        return with_card_relations(Movie.objects.filter(id__in=ids)).order_by("-popularity")


class MoviePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 50


class MovieSearchView(CountryContextMixin, generics.ListAPIView):
    """
    `?q=&genre=&maxRuntime=&provider=&yearFrom=&minRating=&page=` (genre/provider: id-uri separate prin virgulă).
    Cu cheie TMDB: rezultatele vin direct de la TMDB, 20 pe pagină (`pageSize` e ignorat).
    Cu `q`, TMDB nu permite filtre de durată și platformă; gen, an și notă se aplică pe pagina curentă.
    """

    serializer_class = MovieSummarySerializer
    pagination_class = MoviePagination

    def list(self, request, *args, **kwargs):
        if catalog.tmdb_enabled():
            return self._list_from_tmdb(request)
        return super().list(request, *args, **kwargs)

    def _list_from_tmdb(self, request):
        p = request.query_params
        genre_ids = [i for i in (_int(x) for x in p.get("genre", "").split(",")) if i]
        provider_ids = [i for i in (_int(x) for x in p.get("provider", "").split(",")) if i]
        page = max(_int(p.get("page")) or 1, 1)
        data = catalog.browse(
            q=(p.get("q") or "").strip(),
            page=page,
            genre_tmdb_ids=list(Genre.objects.filter(id__in=genre_ids).values_list("tmdb_id", flat=True)),
            provider_tmdb_ids=list(StreamingProvider.objects.filter(id__in=provider_ids).values_list("tmdb_id", flat=True)),
            country=request_country(request),
            max_runtime=_int(p.get("maxRuntime")),
            year_from=_int(p.get("yearFrom")),
            min_rating=_float(p.get("minRating")),
        )

        def url(n):
            query = request.query_params.copy()
            query["page"] = n
            return f"{request.build_absolute_uri(request.path)}?{query.urlencode()}"

        page = data["page"]
        return Response(
            {
                "count": data["count"],
                "next": url(page + 1) if page < data["total_pages"] else None,
                "previous": url(page - 1) if page > 1 else None,
                "results": data["results"],
            }
        )

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
    """
    Platformele de streaming (tabelă mică, sincronizată cu `sync_movies --providers --country RO`).
    Fără cheie TMDB (mod demo), `?country=RO` filtrează după filmele din DB.
    """

    serializer_class = ProviderSerializer
    pagination_class = None

    def get_queryset(self):
        qs = StreamingProvider.objects.all()
        country = self.request.query_params.get("country")
        if country and not catalog.tmdb_enabled():
            qs = qs.filter(movieprovider__country=country.upper()).distinct()
        return qs


class MovieDetailView(CountryContextMixin, generics.RetrieveAPIView):
    """
    Detalii film (`:id` = id TMDB). Accesibil și invitaților.
    Cu cheie TMDB: de la TMDB (cache 6 h), fără salvare în DB; dacă TMDB nu răspunde, din DB (dacă există).
    """

    serializer_class = MovieDetailSerializer
    permission_classes = [IsUserOrGuest]
    queryset = with_card_relations(Movie.objects.all())
    lookup_field = "tmdb_id"
    lookup_url_kwarg = "pk"

    @extend_schema(responses=MovieDetailSerializer)
    def retrieve(self, request, *args, **kwargs):
        if catalog.tmdb_enabled():
            try:
                return Response(catalog.detail(kwargs["pk"], request_country(request)))
            except ApiError as exc:
                if exc.error_code != "TMDB_UNAVAILABLE" or not Movie.objects.filter(tmdb_id=kwargs["pk"]).exists():
                    raise
        return super().retrieve(request, *args, **kwargs)
