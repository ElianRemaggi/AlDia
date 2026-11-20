"""
PDF price-list parser.

Strategy:
1. Tables (deterministic, free): pdfplumber table extraction + the same
   header/column detection used by the Excel parser.
2. LLM fallback: when no usable table is found, the page text is sent to an
   OpenAI-compatible LLM (see core.llm_extractor). Every price the LLM returns
   must appear verbatim in the source text, otherwise the row is rejected.
3. OCR: if the PDF has no text layer (scanned), tesseract is used when
   available; otherwise the file fails with a clear error.
"""
from __future__ import annotations

import re

import pdfplumber

from core.llm_extractor import ChatClient, LlmSettings, OpenAICompatibleClient, extract_items
from core.models import ParseResult, ParsedRow, ParserConfig
from core.normalizer import infer_price_format, normalize_price
from parsers.base import BaseParser, _normalize_header


class PdfParser(BaseParser):
    PARSER_NAME = "pdf"
    LLM_PARSER_NAME = "pdf_llm"
    VERSION = "1.0.0"

    def __init__(
        self,
        config: ParserConfig | None = None,
        llm_client: ChatClient | None = None,
        llm_settings: LlmSettings | None = None,
    ) -> None:
        super().__init__(config)
        self._llm_client = llm_client
        self._llm_settings = llm_settings

    def parse(self, filepath: str) -> ParseResult:
        text, table_rows = _read_pdf(filepath)

        if table_rows:
            result = self._parse_tables(table_rows, filepath)
            if result is not None:
                return result

        if not text.strip():
            text = _ocr(filepath)

        return self._parse_with_llm(text, filepath)

    # ── 1. Tables ────────────────────────────────────────────────────────────

    def _parse_tables(self, all_rows: list[list], filepath: str) -> ParseResult | None:
        """Parse extracted tables. Returns None if the tables don't look like a price list."""
        header_idx = (
            self.config.header_row
            if self.config.header_row is not None
            else self._detect_header_row(all_rows)
        )
        if header_idx >= len(all_rows):
            return None
        header = all_rows[header_idx]
        col_map = self._resolve_column_mapping(header)
        if "name" not in col_map or "price" not in col_map:
            return None

        header_key = [_normalize_header(str(c or "")) for c in header]
        data_rows = [
            (header_idx + 1 + i, row)
            for i, row in enumerate(all_rows[header_idx + 1 :])
            if header_idx + 1 + i not in self.config.skip_rows
            # pdfplumber repeats the header on every page
            and [_normalize_header(str(c or "")) for c in row] != header_key
            and not all(c is None or str(c).strip() == "" for c in row)
        ]

        price_format = infer_price_format(
            [_cell(row, col_map, "price") for _, row in data_rows], self.config.price_format
        )

        parsed: list[ParsedRow] = []
        errors: list[dict] = []
        for absolute_idx, row in data_rows:
            name = _str_or_none(_cell(row, col_map, "name"))
            if not name:
                errors.append({"row": absolute_idx, "reason": "product name missing"})
                continue
            unit_cost = normalize_price(_cell(row, col_map, "price"), price_format)
            if unit_cost is None:
                errors.append({"row": absolute_idx, "reason": "price missing or unparseable"})
                continue
            parsed.append(
                ParsedRow(
                    position_index=len(parsed),
                    raw_name=name,
                    unit_cost=unit_cost,
                    supplier_product_code=_str_or_none(_cell(row, col_map, "code")),
                    unit=_str_or_none(_cell(row, col_map, "unit")),
                    brand=_str_or_none(_cell(row, col_map, "brand")),
                    category=_str_or_none(_cell(row, col_map, "category")),
                )
            )

        # A table that is mostly noise (layout tables, mis-detected columns) → let the LLM try.
        if not parsed or len(errors) > len(parsed):
            return None

        return ParseResult(
            parser=self.PARSER_NAME,
            version=self.VERSION,
            source_file=filepath,
            total_rows=len(parsed),
            rows=parsed,
            errors=errors,
        )

    # ── 2. LLM ───────────────────────────────────────────────────────────────

    def _parse_with_llm(self, text: str, filepath: str) -> ParseResult:
        settings = self._llm_settings or LlmSettings.from_env()
        client = self._llm_client or OpenAICompatibleClient(settings)
        chunks = extract_items(text.splitlines(), client, settings)

        price_format = infer_price_format(
            [item.get("price_text") for c in chunks for item in c.items], self.config.price_format
        )

        parsed: list[ParsedRow] = []
        errors: list[dict] = []
        for chunk in chunks:
            if chunk.error:
                errors.append({"row": None, "chunk": chunk.index, "reason": chunk.error})
                continue
            source = chunk.text
            for item in chunk.items:
                name = _str_or_none(item.get("name"))
                if not name:
                    errors.append({"row": None, "chunk": chunk.index, "reason": "product name missing"})
                    continue
                price_text = _str_or_none(item.get("price_text"))
                if not price_text:
                    errors.append(_item_error(chunk.index, name, "price missing"))
                    continue
                # The LLM must copy prices, never compute or invent them.
                if not _appears(price_text, source):
                    errors.append(_item_error(chunk.index, name, "price not found in source text"))
                    continue
                unit_cost = normalize_price(price_text, price_format)
                if unit_cost is None:
                    errors.append(_item_error(chunk.index, name, "price unparseable"))
                    continue
                code = _str_or_none(item.get("code"))
                # A wrong code would match the wrong product on the next import — drop unverifiable ones.
                if code and not _appears(code, source):
                    code = None
                parsed.append(
                    ParsedRow(
                        position_index=len(parsed),
                        raw_name=name,
                        unit_cost=unit_cost,
                        supplier_product_code=code,
                        unit=_str_or_none(item.get("unit")),
                        brand=_str_or_none(item.get("brand")),
                        category=_str_or_none(item.get("category")),
                    )
                )

        return ParseResult(
            parser=self.LLM_PARSER_NAME,
            version=self.VERSION,
            source_file=filepath,
            total_rows=len(parsed),
            rows=parsed,
            errors=errors,
        )


# ── helpers ──────────────────────────────────────────────────────────────────


def _read_pdf(filepath: str) -> tuple[str, list[list]]:
    """Return (full text, all table rows across pages). Cell newlines are flattened."""
    texts: list[str] = []
    table_rows: list[list] = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            texts.append(page.extract_text() or "")
            for table in page.extract_tables():
                for row in table:
                    table_rows.append(
                        [re.sub(r"\s+", " ", c).strip() if isinstance(c, str) else c for c in row]
                    )
    return "\n".join(texts), table_rows


def _ocr(filepath: str) -> str:
    """OCR fallback for scanned PDFs. Needs tesseract-ocr (+spa) and poppler-utils installed."""
    try:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(filepath)
        text = "\n".join(pytesseract.image_to_string(img, lang="spa") for img in images)
    except Exception as e:  # missing binaries/libs, unreadable images
        raise ValueError(
            f"PDF has no extractable text (probably scanned) and OCR failed: {e}"
        ) from e
    if not text.strip():
        raise ValueError("PDF has no extractable text, OCR returned nothing")
    return text


def _cell(row: list, col_map: dict[str, int], field: str) -> object | None:
    idx = col_map.get(field)
    if idx is None or idx >= len(row):
        return None
    return row[idx]


def _str_or_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None



def _item_error(chunk: int, name: str, reason: str) -> dict:
    return {"row": None, "chunk": chunk, "reason": reason, "raw_name": name}


def _appears(value: str, source: str) -> bool:
    """
    True if value appears verbatim in source and not as part of a longer
    number, word or code ("001" does not match "LAC-001"). Whitespace is
    ignored because PDF text extraction often adds or drops spaces.
    """
    chars = re.sub(r"\s+", "", value)
    if not chars:
        return False
    needle = r"\s*".join(re.escape(ch) for ch in chars)
    return re.search(rf"(?<![\w.,/-]){needle}(?![\w/-]|[.,]\d)", source) is not None
