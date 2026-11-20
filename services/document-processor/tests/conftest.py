"""Shared test fixtures for the document-processor test suite."""
from __future__ import annotations

import io
import os
import tempfile

import openpyxl
import pytest


def make_xlsx(rows: list[list], filename: str = "test.xlsx") -> str:
    """
    Write rows to a temporary .xlsx file and return the file path.
    The file is cleaned up after the test via the tmp_path fixture.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    path = os.path.join(tempfile.mkdtemp(), filename)
    wb.save(path)
    return path


def make_csv(rows: list[list], delimiter: str = ",", encoding: str = "utf-8", filename: str = "test.csv") -> str:
    """
    Write rows to a temporary .csv file and return the file path.
    """
    lines = [delimiter.join(str(c) for c in row) for row in rows]
    content = "\n".join(lines)
    path = os.path.join(tempfile.mkdtemp(), filename)
    with open(path, "w", encoding=encoding) as f:
        f.write(content)
    return path


# ---------------------------------------------------------------------------
# Standard fixture data
# ---------------------------------------------------------------------------

STANDARD_HEADER = ["Código", "Nombre", "Unidad", "Precio"]

STANDARD_DATA_ROWS = [
    ["LAC-001", "Leche Entera x 1L", "unidad", "1500.50"],
    ["LAC-002", "Yogur Natural 200g", "unidad", "850.00"],
    ["PAN-001", "Pan Lactal 500g", "kg", "2200.00"],
]


@pytest.fixture
def standard_xlsx():
    rows = [STANDARD_HEADER] + STANDARD_DATA_ROWS
    return make_xlsx(rows)


@pytest.fixture
def standard_csv():
    rows = [STANDARD_HEADER] + STANDARD_DATA_ROWS
    return make_csv(rows)


@pytest.fixture
def semicolon_csv():
    rows = [STANDARD_HEADER] + STANDARD_DATA_ROWS
    return make_csv(rows, delimiter=";")


@pytest.fixture
def ars_price_csv():
    """CSV with Argentine-format prices (dot=thousands, comma=decimal)."""
    header = ["Código", "Nombre", "Precio"]
    data = [
        ["LAC-001", "Leche Entera", "1.500,50"],
        ["PAN-001", "Pan Lactal", "2.200,00"],
    ]
    # Semicolon-delimited: with "," the decimal comma would split the price cell
    return make_csv([header] + data, delimiter=";")


@pytest.fixture
def missing_price_xlsx():
    """Excel with one row missing the price column value."""
    rows = [
        STANDARD_HEADER,
        ["LAC-001", "Leche Entera x 1L", "unidad", "1500.50"],
        ["LAC-002", "Yogur Natural", "unidad", ""],   # missing price
        ["PAN-001", "Pan Lactal 500g", "kg", "2200"],
    ]
    return make_xlsx(rows)


@pytest.fixture
def missing_name_xlsx():
    """Excel with one row missing the product name."""
    rows = [
        STANDARD_HEADER,
        ["LAC-001", "Leche Entera x 1L", "unidad", "1500.50"],
        ["LAC-002", None, "unidad", "850.00"],         # missing name
    ]
    return make_xlsx(rows)


@pytest.fixture
def empty_xlsx():
    return make_xlsx([])


@pytest.fixture
def no_header_xlsx():
    """Excel with no header row — just data rows with obvious column content."""
    rows = [
        ["LAC-001", "Leche Entera x 1L", "unidad", 1500.50],
        ["LAC-002", "Yogur Natural", "unidad", 850.00],
    ]
    return make_xlsx(rows)
