from app.utils.person_names import format_person_name


def test_format_person_name_collapses_and_titles():
    assert format_person_name("sandra sagar") == "Sandra Sagar"
    assert format_person_name("KJ PRAKASH") == "Kj Prakash"
    assert format_person_name("  bob  smiTH  ") == "Bob Smith"


def test_hyphen_and_apostrophe():
    assert format_person_name("MARY-JANE") == "Mary-Jane"
    assert format_person_name("O'BRIEN") == "O'Brien"


def test_none_and_empty():
    assert format_person_name(None) is None
    assert format_person_name("") == ""
    assert format_person_name("   ") == ""
