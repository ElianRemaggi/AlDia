"""
Price string normalization for Argentine and international formats.

Supported input formats:
  decimal_point : "1500.50"  | "1,500.50"  | "$1,500.50"
  decimal_comma : "1500,50"  | "1.500,50"  | "$ 1.500,50"
  integers      : "1500"     | "1.500"     | "1,500"
"""
from __future__ import annotations

import re


def normalize_price(value: object, price_format: str = "decimal_point") -> float | None:
    """
    Convert a raw cell value to a float price.

    Returns None if the value cannot be interpreted as a price.
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        f = float(value)
        return f if f >= 0 else None

    text = str(value).strip()

    # Strip currency symbols and whitespace
    text = re.sub(r"[$€£\s]", "", text)

    if not text:
        return None

    try:
        if price_format == "decimal_comma":
            return _parse_decimal_comma(text)
        else:
            return _parse_decimal_point(text)
    except ValueError:
        return None


def _parse_decimal_comma(text: str) -> float:
    """
    Decimal separator is comma. Thousands separator is dot (or space).
    Examples: "1.500,50"  →  1500.50
              "1500,5"    →  1500.5
              "1500"      →  1500.0
    """
    # Has both dot and comma → dot=thousands, comma=decimal
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        # Only comma → it's the decimal separator
        text = text.replace(",", ".")
    # Only dots or no separators → treat as integer or decimal_point
    # e.g. "1.500" with no comma: ambiguous, treat dot as thousands if 3 digits after
    elif "." in text:
        parts = text.split(".")
        if len(parts) == 2 and len(parts[1]) == 3:
            # "1.500" → thousands separator
            text = text.replace(".", "")
        # else "1.5" → keep as is (decimal point)

    return float(text)


def _parse_decimal_point(text: str) -> float:
    """
    Decimal separator is dot. Thousands separator is comma (or space).
    Examples: "1,500.50"  →  1500.50
              "1500.5"    →  1500.5
              "1500"      →  1500.0
    """
    # Has both comma and dot → comma=thousands, dot=decimal
    if "," in text and "." in text:
        text = text.replace(",", "")
    elif "," in text:
        # Only comma → treat as thousands separator (e.g. "1,500")
        parts = text.split(",")
        if len(parts) == 2 and len(parts[1]) == 3:
            text = text.replace(",", "")
        else:
            # Unusual: "1,5" → treat comma as decimal
            text = text.replace(",", ".")

    return float(text)


_COMMA_DECIMAL = re.compile(r"(\d\.\d{3},\d{1,2}$)|(\d,\d{1,2}$)")
_POINT_DECIMAL = re.compile(r"(\d,\d{3}\.\d{1,2}$)|(\d\.\d{1,2}$)")


def infer_price_format(values: list[object], default: str = "decimal_point") -> str:
    """
    Guess the price format from a sample of raw price strings.

    Only unambiguous evidence counts: "1.500,50" / "850,5" vote decimal_comma,
    "1,500.50" / "850.50" vote decimal_point. Integers like "1.500" or "1500"
    don't vote. Returns `default` when there is no evidence or it's a tie.
    """
    comma = point = 0
    for value in values:
        if value is None or isinstance(value, (int, float)):
            continue
        text = re.sub(r"[$€£\s]", "", str(value))
        if _COMMA_DECIMAL.search(text):
            comma += 1
        elif _POINT_DECIMAL.search(text):
            point += 1
    if comma > point:
        return "decimal_comma"
    if point > comma:
        return "decimal_point"
    return default
