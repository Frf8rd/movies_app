"""Toate erorile ies în același format: {"error": {"code": ..., "message": ...}}"""
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler

CODES = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "UNPROCESSABLE",
    429: "TOO_MANY_REQUESTS",
}


class ApiError(APIException):
    """Eroare cu cod propriu: raise ApiError(409, "EMAIL_EXISTS", "Email-ul e deja folosit")."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(detail=message, code=code)
        self.status_code = status_code
        self.error_code = code


class Conflict(ApiError):
    def __init__(self, code="CONFLICT", message="Conflict"):
        super().__init__(status.HTTP_409_CONFLICT, code, message)


class Unprocessable(ApiError):
    def __init__(self, code="UNPROCESSABLE", message="Cererea nu poate fi procesată"):
        super().__init__(422, code, message)


def _first_message(detail) -> str:
    if isinstance(detail, dict):
        for key, value in detail.items():
            msg = _first_message(value)
            return msg if key in ("detail", "non_field_errors") else f"{key}: {msg}"
        return "Cerere invalidă"
    if isinstance(detail, (list, tuple)):
        return _first_message(detail[0]) if detail else "Cerere invalidă"
    return str(detail)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    code = getattr(exc, "error_code", None) or CODES.get(response.status_code, "ERROR")
    body = {"code": code, "message": _first_message(response.data)}
    if isinstance(exc, ValidationError) and isinstance(response.data, dict):
        body["details"] = response.data
    response.data = {"error": body}
    return response
