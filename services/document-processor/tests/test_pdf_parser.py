from __future__ import annotations

import json
import os
import tempfile
import threading

import pytest
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from core.factory import select_parser
from core.llm_extractor import LlmSettings, build_user_message, chunk_lines, extract_items
from core.normalizer import infer_price_format
from parsers.pdf_parser import PdfParser, _appears


# ── helpers ──────────────────────────────────────────────────────────────────


def _tmp_pdf() -> str:
    return os.path.join(tempfile.mkdtemp(), "lista.pdf")


def make_table_pdf(rows: list[list]) -> str:
    path = _tmp_pdf()
    table = Table(rows)
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "black")]))
    SimpleDocTemplate(path, pagesize=A4).build([table])
    return path


def make_text_pdf(lines: list[str]) -> str:
    path = _tmp_pdf()
    c = canvas.Canvas(path, pagesize=A4)
    y = 800
    for line in lines:
        c.drawString(40, y, line)
        y -= 16
    c.save()
    return path


def make_blank_pdf() -> str:
    path = _tmp_pdf()
    c = canvas.Canvas(path, pagesize=A4)
    c.showPage()
    c.save()
    return path


class FakeClient:
    """Returns canned LLM responses; records the user messages it received."""

    def __init__(self, *responses: dict | str | tuple[str, bool]):
        self._responses = list(responses)
        self.calls: list[str] = []
        self._lock = threading.Lock()

    def complete(self, system: str, user: str) -> tuple[str, bool]:
        with self._lock:
            self.calls.append(user)
            resp = self._responses[min(len(self.calls) - 1, len(self._responses) - 1)]
        if isinstance(resp, tuple):
            return resp
        if isinstance(resp, dict):
            return json.dumps(resp), False
        return resp, False


SETTINGS = LlmSettings(api_key="test", max_workers=1)

TEXT_LINES = [
    "DISTRIBUIDORA EL SOL - LISTA DE PRECIOS",
    "LACTEOS",
    "LAC-001 Leche Entera x 1L $ 1.500,50",
    "LAC-002 Yogur Natural 200g $ 850,00",
    "Consultas: ventas@elsol.com",
]


# ── table path (no LLM) ──────────────────────────────────────────────────────


class TestPdfTables:
    def test_parses_table_without_llm(self):
        path = make_table_pdf(
            [
                ["Código", "Descripción", "Unidad", "Precio"],
                ["LAC-001", "Leche Entera x 1L", "unidad", "$ 1.500,50"],
                ["LAC-002", "Yogur Natural 200g", "unidad", "$ 850,00"],
            ]
        )
        client = FakeClient({"items": []})
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(path)

        assert client.calls == []
        assert result.parser == "pdf"
        assert result.total_rows == 2
        assert result.errors == []
        row = result.rows[0]
        assert row.raw_name == "Leche Entera x 1L"
        assert row.supplier_product_code == "LAC-001"
        assert row.unit == "unidad"
        assert row.unit_cost == 1500.50
        assert result.rows[1].unit_cost == 850.0
        assert [r.position_index for r in result.rows] == [0, 1]

    def test_skips_repeated_header_rows(self):
        header = ["Código", "Producto", "Precio"]
        path = make_table_pdf(
            [header, ["A1", "Salame", "3500"], header, ["A2", "Queso", "4200"]]
        )
        result = PdfParser(llm_client=FakeClient(), llm_settings=SETTINGS).parse(path)
        assert result.total_rows == 2
        assert result.errors == []

    def test_table_without_price_column_falls_back_to_llm(self):
        path = make_table_pdf([["Nombre", "Teléfono"], ["Juan", "1234"]])
        client = FakeClient({"items": []})
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(path)
        assert len(client.calls) == 1
        assert result.parser == "pdf_llm"


# ── LLM path ─────────────────────────────────────────────────────────────────


class TestPdfLlm:
    def test_extracts_and_normalizes_rows(self):
        client = FakeClient(
            {
                "items": [
                    {"code": "LAC-001", "name": "Leche Entera x 1L", "price_text": "$ 1.500,50",
                     "unit": None, "brand": None, "category": "LACTEOS"},
                    {"code": "LAC-002", "name": "Yogur Natural 200g", "price_text": "$ 850,00",
                     "unit": None, "brand": None, "category": "LACTEOS"},
                ]
            }
        )
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))

        assert result.parser == "pdf_llm"
        assert result.errors == []
        assert result.total_rows == 2
        assert result.rows[0].unit_cost == 1500.50
        assert result.rows[0].supplier_product_code == "LAC-001"
        assert result.rows[0].category == "LACTEOS"
        assert result.rows[1].unit_cost == 850.0

    def test_rejects_price_not_present_in_source(self):
        client = FakeClient(
            {"items": [{"code": "LAC-001", "name": "Leche Entera x 1L", "price_text": "1.600,00"}]}
        )
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))
        assert result.total_rows == 0
        assert result.errors[0]["reason"] == "price not found in source text"

    def test_drops_invented_code_but_keeps_row(self):
        client = FakeClient(
            {"items": [{"code": "001", "name": "Leche Entera x 1L", "price_text": "$ 1.500,50"}]}
        )
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))
        assert result.total_rows == 1
        assert result.rows[0].supplier_product_code is None

    def test_missing_code_stays_none(self):
        client = FakeClient({"items": [{"name": "Leche Entera x 1L", "price_text": "$ 1.500,50"}]})
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))
        assert result.rows[0].supplier_product_code is None

    def test_truncated_response_is_reported(self):
        client = FakeClient(('{"items": [{"name": "Lec', True))
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))
        assert result.total_rows == 0
        assert result.errors == [
            {"row": None, "chunk": 0, "reason": "LLM response truncated (max_tokens)"}
        ]

    def test_invalid_json_is_reported(self):
        client = FakeClient("no soy json")
        result = PdfParser(llm_client=client, llm_settings=SETTINGS).parse(make_text_pdf(TEXT_LINES))
        assert result.errors[0]["reason"] == "LLM returned invalid JSON"

    def test_missing_api_key_raises_clear_error(self):
        settings = LlmSettings(api_key=None)
        with pytest.raises(ValueError, match="LLM_API_KEY"):
            PdfParser(llm_settings=settings).parse(make_text_pdf(TEXT_LINES))

    def test_blank_pdf_without_ocr_raises(self, monkeypatch):
        import builtins

        real_import = builtins.__import__

        def no_ocr(name, *args, **kwargs):
            if name in ("pytesseract", "pdf2image"):
                raise ImportError(name)
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", no_ocr)
        with pytest.raises(ValueError, match="no extractable text"):
            PdfParser(llm_client=FakeClient(), llm_settings=SETTINGS).parse(make_blank_pdf())


# ── extractor building blocks ────────────────────────────────────────────────


class TestLlmExtractor:
    def test_chunk_lines_never_splits_a_line(self):
        lines = ["a" * 40, "b" * 40, "c" * 40]
        chunks = chunk_lines(lines, max_chars=90)
        assert chunks == ["a" * 40 + "\n" + "b" * 40, "c" * 40]

    def test_later_chunks_get_document_context(self):
        assert build_user_message(0, "x", "ctx") == "Texto:\nx"
        assert "ctx" in build_user_message(1, "x", "ctx")

    def test_results_keep_document_order(self):
        settings = LlmSettings(api_key="t", chunk_chars=10, max_workers=4)
        client = FakeClient({"items": []})
        results = extract_items(["linea uno", "linea dos", "linea tres"], client, settings)
        assert [r.index for r in results] == [0, 1, 2]
        assert len(client.calls) == 3

    def test_api_exception_is_reported_per_chunk(self):
        class Boom:
            def complete(self, system, user):
                raise RuntimeError("timeout")

        results = extract_items(["x"], Boom(), SETTINGS)
        assert results[0].error == "LLM request failed: timeout"


class TestAppears:
    @pytest.mark.parametrize(
        "value,source,expected",
        [
            ("1.500,50", "Leche $ 1.500,50 c/u", True),
            ("$1.500,50", "Leche $ 1.500,50", True),
            ("1500", "Total 21500", False),
            ("1.500", "Leche 1.500,50", False),
            ("LAC-001", "LAC-0012 Leche", False),
            ("LAC-001", "LAC-001 Leche", True),
        ],
    )
    def test_cases(self, value, source, expected):
        assert _appears(value, source) is expected


class TestInferPriceFormat:
    def test_argentine_format(self):
        assert infer_price_format(["$ 1.500,50", "850,00", "2.200"]) == "decimal_comma"

    def test_point_format(self):
        assert infer_price_format(["1,500.50", "850.00"]) == "decimal_point"

    def test_ambiguous_uses_default(self):
        assert infer_price_format(["1.500", "2200", 300], default="decimal_comma") == "decimal_comma"


def test_factory_selects_pdf_parser():
    assert isinstance(select_parser("lista.pdf"), PdfParser)
