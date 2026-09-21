"""Persian text normalization for scoring speech recognition output.

Applied to both the reference transcript and the model output before WER and CER
are computed. Every rule removes a difference in how Persian text can be written
that does not change what was said. Without it, error rates count spelling
conventions as recognition mistakes.

Known limitation: words written with no space at all ("میروم") still differ from
the spaced forms ("می روم"). Fixing that needs a Persian word segmenter. CER is
barely affected by spacing, which is one reason the benchmark reports it next to
WER.

Usage:
    python lab/normalize.py                 run the self tests
    python lab/normalize.py "some text"     print the normalized text
"""

import re
import sys
import unicodedata

# Rule 1: letters that look identical on screen but are different code points.
LETTER_MAP = {
    "ي": "ی",  # ي Arabic yeh         -> ی Persian yeh
    "ى": "ی",  # ى alef maksura       -> ی Persian yeh
    "ك": "ک",  # ك Arabic kaf         -> ک Persian kaf
    "ۀ": "ه",  # ۀ heh with yeh above -> ه, matching rule 3, which
                         #   strips the separate hamza from the typed form هٔ
}

# Rule 2: Persian (۰ to ۹) and Arabic (٠ to ٩) digits become ASCII digits.
DIGIT_MAP = {chr(0x06F0 + i): str(i) for i in range(10)}
DIGIT_MAP.update({chr(0x0660 + i): str(i) for i in range(10)})

TRANSLATE = str.maketrans({**LETTER_MAP, **DIGIT_MAP})

# Rule 3: diacritics and tatweel.
# U+064B to U+065F: short vowels, tanwin, shadda, sukun, hamza above and below.
# U+0670: superscript alef. U+0640: tatweel, a stretching character.
DIACRITICS = re.compile("[ً-ٰٟـ]")

# Rule 4: invisible characters. The half space (ZWNJ) becomes a normal space.
# Other zero width characters and text direction marks are removed.
ZWNJ = "‌"
INVISIBLE = re.compile("[​‍‎‏‪-‮⁦-⁩﻿]")

WHITESPACE = re.compile(r"\s+")


def _punctuation_to_space(text: str) -> str:
    # Rule 5: every Unicode punctuation character (category P) becomes a space,
    # so "سلام،خوبی" splits into two words instead of merging into one.
    return "".join(" " if unicodedata.category(ch).startswith("P") else ch for ch in text)


def normalize(text: str) -> str:
    """Return text in the canonical form used for scoring."""
    # NFKC first. It folds Arabic presentation forms (common in text copied from
    # PDFs) into ordinary letters, and keeps characters such as آ as a single
    # composed code point, so rule 3 cannot strip its madda and turn it into ا.
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(TRANSLATE)
    text = DIACRITICS.sub("", text)
    text = INVISIBLE.sub("", text)
    text = text.replace(ZWNJ, " ")
    text = _punctuation_to_space(text)
    text = text.casefold()  # English words written in Latin script
    text = WHITESPACE.sub(" ", text).strip()
    return text


# Test inputs use \u escapes wherever the difference is invisible, so an editor
# cannot silently "fix" them.
_CASES = [
    ("Arabic kaf to Persian kaf", "كتاب", "کتاب"),
    ("Arabic yeh to Persian yeh", "علي", "علی"),
    ("alef maksura to Persian yeh", "موسى", "موسی"),
    ("Persian digits to ASCII", "۱۴۰۳", "1403"),
    ("Arabic digits to ASCII", "٢٠", "20"),
    ("short vowel marks removed", "کِتابْ", "کتاب"),
    ("tatweel removed", "ســلام", "سلام"),
    ("half space becomes space", "می‌روم", "می روم"),
    ("ezafe hamza removed", "خانهٔ من", "خانه من"),
    ("precomposed ezafe to heh", "خانۀ من", "خانه من"),
    ("Persian punctuation removed", "سلام، خوبی؟", "سلام خوبی"),
    ("guillemets removed", "«سلام»", "سلام"),
    ("punctuation without space splits words", "سلام،خوبی", "سلام خوبی"),
    ("alef madda survives, composed", "آب", "آب"),
    ("alef madda survives, decomposed", "آب", "آب"),
    ("presentation forms folded", "ﺳﻼﻡ", "سلام"),
    ("direction marks removed", "‏سلام‎", "سلام"),
    ("extra spaces collapsed", "  سلام   دنیا \n", "سلام دنیا"),
    ("Latin text lowercased", "Hello دنیا", "hello دنیا"),
]


def _self_test() -> bool:
    failures = 0
    for description, raw, expected in _CASES:
        got = normalize(raw)
        if got == expected:
            print(f"ok    {description}")
        else:
            failures += 1
            print(f"FAIL  {description}")
            print(f"        expected {expected!r}")
            print(f"        got      {got!r}")
    print()
    print(f"{len(_CASES) - failures} of {len(_CASES)} passed")
    return failures == 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(normalize(" ".join(sys.argv[1:])))
    else:
        sys.exit(0 if _self_test() else 1)
