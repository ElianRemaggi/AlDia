from __future__ import annotations

import io

import chardet
import pandas as pd

from core.models import ParseResult, ParsedRow
from core.normalizer import normalize_price
from parsers.base import BaseParser

_COMMON_DELIMITERS = [",", ";", "\t", "|"]


class CsvParser(BaseParser):
    PARSER_NAME = "csv"
    VERSION = "1.0.0"

    def parse(self, filepath: str) -> ParseResult:
        raw_bytes = _read_bytes(filepath)

        # Detect encoding
        detected = chardet.detect(raw_bytes)
        encoding = detected.get("encoding") or self.config.encoding or "utf-8"

        text = raw_bytes.decode(encoding, errors="replace")

        # Detect delimiter
        delimiter = _detect_delimiter(text)

        df = pd.read_csv(
            io.StringIO(text),
            sep=delimiter,
            header=None,  # We handle header detection ourselves
            dtype=str,
            keep_default_na=False,
            skipinitialspace=True,
        )

        if df.empty:
            return ParseResult(
                parser=self.PARSER_NAME,
                version=self.VERSION,
                source_file=filepath,
                total_rows=0,
                rows=[],
                errors=[{"row": None, "reason": "empty file"}],
            )

        all_rows: list[list] = df.values.tolist()

        # Determine header row
        header_row_idx = (
            self.config.header_row
            if self.config.header_row is not None
            else self._detect_header_row(all_rows)
        )
        header = all_rows[header_row_idx]

        # Resolve column mapping
        col_map = self._resolve_column_mapping(header)

        parsed_rows: list[ParsedRow] = []
        errors: list[dict] = []
        data_rows = all_rows[header_row_idx + 1 :]

        for relative_idx, raw_row in enumerate(data_rows):
            absolute_idx = header_row_idx + 1 + relative_idx

            if absolute_idx in self.config.skip_rows:
                continue

            # Skip fully empty rows
            if all(str(c).strip() == "" for c in raw_row):
                continue

            name = _extract(raw_row, col_map, "name")
            if not name or str(name).strip() == "":
                errors.append({"row": absolute_idx, "reason": "product name missing"})
                continue

            raw_price = _extract(raw_row, col_map, "price")
            unit_cost = normalize_price(raw_price, self.config.price_format)
            if unit_cost is None:
                errors.append({"row": absolute_idx, "reason": "price missing or unparseable"})
                continue

            parsed_rows.append(
                ParsedRow(
                    position_index=relative_idx,
                    raw_name=str(name).strip(),
                    unit_cost=unit_cost,
                    supplier_product_code=_str_or_none(_extract(raw_row, col_map, "code")),
                    unit=_str_or_none(_extract(raw_row, col_map, "unit")),
                    brand=_str_or_none(_extract(raw_row, col_map, "brand")),
                    category=_str_or_none(_extract(raw_row, col_map, "category")),
                )
            )

        return ParseResult(
            parser=self.PARSER_NAME,
            version=self.VERSION,
            source_file=filepath,
            total_rows=len(parsed_rows),
            rows=parsed_rows,
            errors=errors,
        )


def _read_bytes(filepath: str) -> bytes:
    with open(filepath, "rb") as f:
        return f.read()


def _detect_delimiter(text: str) -> str:
    """Count each candidate delimiter in the first 5 lines and pick the most common."""
    first_lines = "\n".join(text.splitlines()[:5])
    counts = {d: first_lines.count(d) for d in _COMMON_DELIMITERS}
    return max(counts, key=lambda d: counts[d])


def _extract(row: list, col_map: dict[str, int], field: str) -> object | None:
    idx = col_map.get(field)
    if idx is None or idx >= len(row):
        return None
    return row[idx]


def _str_or_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None
