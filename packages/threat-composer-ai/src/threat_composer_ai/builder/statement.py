"""
Threat statement composition.

Mirrors how the Threat Composer UI renders a statement from its grammar fields
(packages/threat-composer/src/utils/renderThreatStatement and
src/data/threatStatementFormat.ts), so a statement built here reads the same as
one typed into the app:

    A/An [threat_source] [prerequisites] can [threat_action]
        [, which leads to [threat_impact]]
        [, resulting in reduced [impacted_goal] [of [impacted_assets]]]
        [, negatively impacting [impacted_assets]]   (when there is no goal)

Goals are joined with "and/or" and assets with "and", as renderArrayField does.
Building this in code replaces the eight hand-written permutations the agent
prompts used to ask the model to choose between.
"""

import re

_AN_LETTERS = set("AEFHILMNORSX")  # letters whose names start with a vowel sound
_A_PREFIXES = ("uni", "use", "usa", "usu", "uti", "eu", "one", "once", "ubiq")
_AN_PREFIXES = ("hour", "honest", "honor", "honour", "heir")
_LEADING_ARTICLE = re.compile(r"^(a|an|the)\s+", re.IGNORECASE)


def indefinite_article(phrase: str) -> str:
    """Return "a" or "an" for the start of a phrase."""
    word = phrase.strip().split(" ", 1)[0] if phrase.strip() else ""
    if not word:
        return "a"
    letters = re.sub(r"[^A-Za-z]", "", word)
    if not letters:
        return "a"
    # An acronym is read letter by letter: "an MITM", "a TLS", "an S3 bucket"
    is_acronym = letters.isupper() and (
        len(letters) > 1 or any(c.isdigit() for c in word)
    )
    if is_acronym:
        return "an" if letters[0] in _AN_LETTERS else "a"
    lower = letters.lower()
    if lower.startswith(_AN_PREFIXES):
        return "an"
    if lower.startswith(_A_PREFIXES):
        return "a"
    return "an" if lower[0] in "aeiou" else "a"


def lower_first(text: str) -> str:
    """Lower-case the first character unless the first word is an acronym or
    proper noun with internal capitals (for example "API" or "OAuth")."""
    text = text.strip()
    if not text:
        return text
    first = text.split(" ", 1)[0]
    if any(c.isupper() for c in first[1:]):
        return text
    return text[0].lower() + text[1:]


def join_list(items: list[str], conjunction: str) -> str:
    items = [i.strip() for i in items if i and i.strip()]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + f" {conjunction} " + items[-1]


# Port of packages/threat-composer/src/utils/correctIndefiniteArticle. The UI
# runs this over every part of a statement, so "a unexpected" in a field is
# shown as "an unexpected" and "a LLM" as "an LLM".
_ARTICLE_BEFORE_WORD = re.compile(
    r"\b(a|an) ([\s(\"'\u201c\u2018-]?\w*)\b", re.IGNORECASE
)


def correct_articles(text: str) -> str:
    """Fix every "a"/"an" to suit the word that follows it."""

    def fix(match: re.Match) -> str:
        article, following = match.group(1), match.group(2)
        word = re.sub(r"^[\s(\"'\u201c\u2018-]+|\s+$", "", following)
        new = indefinite_article(word)
        return (new.capitalize() if article.startswith("A") else new) + " " + following

    return _ARTICLE_BEFORE_WORD.sub(fix, text)


def normalise_source(threat_source: str) -> str:
    """Drop a leading article; the statement adds the right one."""
    return lower_first(_LEADING_ARTICLE.sub("", threat_source.strip()))


def compose_statement(
    threat_source: str,
    prerequisites: str,
    threat_action: str,
    threat_impact: str = "",
    impacted_goal: list[str] | None = None,
    impacted_assets: list[str] | None = None,
) -> str:
    """Compose a threat statement from its grammar fields."""
    source = normalise_source(threat_source)
    goals = join_list(impacted_goal or [], "and/or")
    assets = join_list(impacted_assets or [], "and")

    article = indefinite_article(source).capitalize()
    parts = [f"{article} {source} {prerequisites.strip()} can {threat_action.strip()}"]
    if threat_impact.strip():
        parts.append(f"which leads to {threat_impact.strip()}")
    if goals and assets:
        parts.append(f"resulting in reduced {goals} of {assets}")
    elif goals:
        parts.append(f"resulting in reduced {goals}")
    elif assets:
        parts.append(f"negatively impacting {assets}")

    return correct_articles(re.sub(r"\s+", " ", ", ".join(parts)).strip())
