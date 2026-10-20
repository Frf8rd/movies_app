"""Conversie snake_case <-> camelCase, ca API-ul să vorbească exact limba din README (movieId, genreIds…)."""
import re

from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer

_snake_re = re.compile(r"(?<=[a-z0-9])([A-Z])")
_camel_re = re.compile(r"_([a-z0-9])")


def to_camel(s: str) -> str:
    return _camel_re.sub(lambda m: m.group(1).upper(), s) if isinstance(s, str) else s


def to_snake(s: str) -> str:
    return _snake_re.sub(lambda m: "_" + m.group(1).lower(), s) if isinstance(s, str) else s


def convert_keys(data, fn):
    if isinstance(data, dict):
        return {fn(k): convert_keys(v, fn) for k, v in data.items()}
    if isinstance(data, (list, tuple)):
        return [convert_keys(v, fn) for v in data]
    return data


class CamelCaseJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        return super().render(convert_keys(data, to_camel), accepted_media_type, renderer_context)


class CamelCaseJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        return convert_keys(super().parse(stream, media_type, parser_context), to_snake)


def camelize_schema_hook(result, generator, request, public):
    """Documentația Swagger arată numele câmpurilor în camelCase, ca în răspunsurile reale."""
    for schema in result.get("components", {}).get("schemas", {}).values():
        if "properties" in schema:
            schema["properties"] = {to_camel(k): v for k, v in schema["properties"].items()}
        if "required" in schema:
            schema["required"] = [to_camel(k) for k in schema["required"]]
    return result
