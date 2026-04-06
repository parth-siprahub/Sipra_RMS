"""Consistent person-name formatting for display and storage (title-style words)."""


def _title_single_word(word: str) -> str:
    if not word:
        return word
    if len(word) == 1:
        return word.upper()
    return word[0].upper() + word[1:].lower()


def _title_token(token: str) -> str:
    """Title-case one name token, including hyphenated and apostrophe forms."""
    if not token:
        return token
    if "-" in token:
        return "-".join(_title_token(part) for part in token.split("-"))
    parts = token.split("'")
    if len(parts) > 1:
        return "'".join(_title_single_word(p) for p in parts)
    return _title_single_word(token)


def format_person_name(value: str | None) -> str | None:
    """
    Normalize whitespace and apply title-style casing per word.
    None stays None; empty / whitespace becomes empty string.
    """
    if value is None:
        return None
    collapsed = " ".join(value.split())
    if not collapsed:
        return ""
    return " ".join(_title_token(t) for t in collapsed.split(" "))
