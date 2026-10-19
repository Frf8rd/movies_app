from drf_spectacular.extensions import OpenApiAuthenticationExtension


class GuestAuthScheme(OpenApiAuthenticationExtension):
    """Apare în Swagger ca schemă de autentificare pentru tokenul de invitat."""

    target_class = "apps.rooms.authentication.GuestJWTAuthentication"
    name = "guestAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Token de invitat primit la POST /rooms/join (valabil doar pentru acea cameră).",
        }
