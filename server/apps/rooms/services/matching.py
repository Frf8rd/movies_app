"""Calculul compatibilității (pe reguli, fără AI). Funcția de bază e pură, deci ușor de testat."""
from dataclasses import dataclass

LIKE, SUPER, DISLIKE, VETO = 1, 2, -1, -99
POINTS = {LIKE: 1, SUPER: 2}
MAX_COMPROMISES = 10


@dataclass
class MovieScore:
    movie_id: int
    score: float  # 0–100
    likes: int
    supers: int
    dislikes: int
    missing: int  # participanți care nu au votat filmul (doar dacă gazda a închis votul mai devreme)
    unanimous: bool


def score_movie(movie_id: int, choices: list[int], member_count: int) -> MovieScore | None:
    """None = film eliminat (cineva a dat VETO)."""
    if VETO in choices:
        return None
    likes = choices.count(LIKE)
    supers = choices.count(SUPER)
    dislikes = choices.count(DISLIKE)
    missing = max(member_count - len(choices), 0)
    points = likes * POINTS[LIKE] + supers * POINTS[SUPER]
    score = round(points / (member_count * 2) * 100, 1) if member_count else 0.0
    unanimous = member_count > 0 and dislikes == 0 and missing == 0
    return MovieScore(movie_id, score, likes, supers, dislikes, missing, unanimous)


def compute_results(movies: list[tuple[int, float]], member_count: int, votes: dict[int, list[int]]) -> dict:
    """
    movies: [(movie_id, rating_tmdb)]   votes: {movie_id: [alegeri…]}  (fără a ști CINE a votat ce)

    Returnează {"unanimous": [...], "closest": [...]}. „closest” se umple doar dacă nu există unanimitate.
    """
    rating = dict(movies)
    scored = [s for mid, _ in movies if (s := score_movie(mid, votes.get(mid, []), member_count))]

    unanimous = sorted(
        (s for s in scored if s.unanimous), key=lambda s: (-s.score, -float(rating[s.movie_id]), s.movie_id)
    )
    closest: list[MovieScore] = []
    if not unanimous:
        closest = sorted(
            scored, key=lambda s: (s.dislikes + s.missing, -s.score, -float(rating[s.movie_id]), s.movie_id)
        )[:MAX_COMPROMISES]
    return {"unanimous": unanimous, "closest": closest}
