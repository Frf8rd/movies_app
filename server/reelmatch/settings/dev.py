from .base import *  # noqa: F401,F403

DEBUG = env.bool("DJANGO_DEBUG", default=True)  # noqa: F405
# pentru testare de pe telefon în rețeaua locală
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["*"])  # noqa: F405
