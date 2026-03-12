import pytest
from core.models import ParserConfig
from parsers.csv_parser import CsvParser


class TestCsvParserHappyPath:
    def test_returns_correct_parser_name(self, standard_csv):
        result = CsvParser().parse(standard_csv)
        assert result.parser == "csv"

    def test_parses_all_data_rows(self, standard_csv):
        result = CsvParser().parse(standard_csv)
        assert result.total_rows == 3
        assert len(result.rows) == 3

    def test_first_row_fields(self, standard_csv):
        result = CsvParser().parse(standard_csv)
        row = result.rows[0]
        assert row.raw_name == "Leche Entera x 1L"
        assert row.supplier_product_code == "LAC-001"
        assert row.unit_cost == 1500.50
        assert row.currency == "ARS"

    def test_no_errors_on_clean_file(self, standard_csv):
        result = CsvParser().parse(standard_csv)
        assert result.errors == []


class TestCsvDelimiterDetection:
    def test_semicolon_delimiter(self, semicolon_csv):
        result = CsvParser().parse(semicolon_csv)
        assert result.total_rows == 3
        assert result.rows[0].raw_name == "Leche Entera x 1L"


class TestCsvArgentinePrices:
    def test_ars_price_format(self, ars_price_csv):
        config = ParserConfig(price_format="decimal_comma")
        result = CsvParser(config).parse(ars_price_csv)
        assert result.total_rows == 2
        assert result.rows[0].unit_cost == 1500.50
        assert result.rows[1].unit_cost == 2200.00


class TestCsvParserErrorHandling:
    def test_missing_price_generates_error(self, standard_csv, tmp_path):
        """Create a CSV where one row has no price."""
        from tests.conftest import make_csv
        rows = [
            ["Código", "Nombre", "Unidad", "Precio"],
            ["LAC-001", "Leche Entera", "unidad", "1500.50"],
            ["LAC-002", "Yogur", "unidad", ""],          # empty price
            ["PAN-001", "Pan Lactal", "kg", "2200.00"],
        ]
        path = make_csv(rows)
        result = CsvParser().parse(path)
        assert result.total_rows == 2
        assert len(result.errors) == 1
        assert "price" in result.errors[0]["reason"]


class TestCsvToDict:
    def test_to_dict_matches_contract(self, standard_csv):
        result = CsvParser().parse(standard_csv)
        d = result.to_dict()
        assert set(d.keys()) == {"parser", "version", "source_file", "total_rows", "rows", "errors"}
        assert d["total_rows"] == 3
