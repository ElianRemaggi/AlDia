from __future__ import annotations

import re
from abc import ABC, abstractmethod

from core.models import ParseResult, ParserConfig

# Keyword sets for column auto-detection (lowercase, no accents needed — we normalize before matching)
_COLUMN_KEYWORDS: dict[str, list[str]] = {
    "code": ["código", "codigo", "cod", "code", "sku", "ref", "referencia", "id", "art", "articulo", "artículo"],
    "name": ["nombre", "descripcion", "descripción", "producto", "name", "description", "detalle", "articulo", "artículo", "item"],
    "price": ["precio", "price", "costo", "cost", "pvp", "importe", "valor", "value", "unitario", "unit price", "p.unit"],
    "unit": ["unidad", "unit", "um", "medida", "presentacion", "presentación", "pack", "bulto"],
    "brand": ["marca", "brand", "fabricante", "manufacturer"],
    "category": ["categoria", "categoría", "category", "rubro", "tipo", "type", "familia"],
}


def _normalize_header(text: str) -> str:
    """Lowercase, strip whitespace, remove special chars for fuzzy matching."""
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    # Remove accent marks for simpler matching
    replacements = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n"}
    for accented, plain in replacements.items():
        text = text.replace(accented, plain)
    return text


class BaseParser(ABC):
    PARSER_NAME: str = "base"
    VERSION: str = "1.0.0"

    def __init__(self, config: ParserConfig | None = None) -> None:
        self.config = config or ParserConfig()

    @abstractmethod
    def parse(self, filepath: str) -> ParseResult:
        """Parse the file at filepath and return normalized ParseResult."""

    def _detect_header_row(self, rows: list[list]) -> int:
        """
        Scan the first 10 rows and return the index of the most likely header row.
        A header row has mostly string (non-numeric) cells.
        """
        for i, row in enumerate(rows[:10]):
            non_empty = [c for c in row if c is not None and str(c).strip() != ""]
            if not non_empty:
                continue
            string_cells = sum(
                1 for c in non_empty
                if not isinstance(c, (int, float)) and not _is_numeric_string(str(c))
            )
            # If >60% of non-empty cells look like strings, this is probably the header
            if string_cells / len(non_empty) > 0.6:
                return i
        return 0  # fallback: first row

    def _detect_column_mapping(self, header: list) -> dict[str, int]:
        """
        Match header cell values against keyword sets.
        Returns a dict mapping logical field name → column index.
        """
        mapping: dict[str, int] = {}
        for col_idx, cell in enumerate(header):
            normalized = _normalize_header(str(cell) if cell is not None else "")
            if not normalized:
                continue
            for field_name, keywords in _COLUMN_KEYWORDS.items():
                if field_name in mapping:
                    continue
                if any(kw in normalized or normalized in kw for kw in keywords):
                    mapping[field_name] = col_idx
                    break
        return mapping

    def _resolve_column_mapping(self, header: list) -> dict[str, int]:
        """
        If config.column_mapping is set, resolve column letters/names to indices.
        Otherwise auto-detect from header values.
        """
        if self.config.column_mapping:
            resolved: dict[str, int] = {}
            for field_name, col_ref in self.config.column_mapping.items():
                col_ref = str(col_ref).strip()
                # Column letter (e.g. "A", "B")
                if re.match(r"^[A-Za-z]{1,2}$", col_ref):
                    idx = _col_letter_to_index(col_ref.upper())
                    resolved[field_name] = idx
                else:
                    # Header name — find it in header row
                    norm_ref = _normalize_header(col_ref)
                    for idx, cell in enumerate(header):
                        if _normalize_header(str(cell) if cell else "") == norm_ref:
                            resolved[field_name] = idx
                            break
            return resolved
        return self._detect_column_mapping(header)


def _is_numeric_string(text: str) -> bool:
    """Return True if the string looks like a number (possibly with currency formatting)."""
    cleaned = re.sub(r"[$€£\s.,]", "", text)
    return bool(cleaned) and cleaned.replace("-", "").isdigit()


def _col_letter_to_index(letter: str) -> int:
    """Convert Excel column letter to 0-based index. A→0, B→1, Z→25, AA→26."""
    result = 0
    for char in letter:
        result = result * 26 + (ord(char) - ord("A") + 1)
    return result - 1
