import pytest
from core.models import ParserConfig
from parsers.excel_parser import ExcelParser


class TestExcelParserHappyPath:
    def test_returns_correct_parser_name(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        assert result.parser == "excel"

    def test_parses_all_data_rows(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        assert result.total_rows == 3
        assert len(result.rows) == 3

    def test_first_row_fields(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        row = result.rows[0]
        assert row.raw_name == "Leche Entera x 1L"
        assert row.supplier_product_code == "LAC-001"
        assert row.unit == "unidad"
        assert row.unit_cost == 1500.50
        assert row.currency == "ARS"

    def test_position_index_is_zero_based(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        assert result.rows[0].position_index == 0
        assert result.rows[1].position_index == 1
        assert result.rows[2].position_index == 2

    def test_no_errors_on_clean_file(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        assert result.errors == []

    def test_source_file_name_in_result(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        assert result.source_file == standard_xlsx


class TestExcelParserErrorHandling:
    def test_missing_price_generates_error(self, missing_price_xlsx):
        result = ExcelParser().parse(missing_price_xlsx)
        assert result.total_rows == 2   # only 2 valid rows
        error_reasons = [e["reason"] for e in result.errors]
        assert any("price" in r for r in error_reasons)

    def test_missing_name_generates_error(self, missing_name_xlsx):
        result = ExcelParser().parse(missing_name_xlsx)
        assert result.total_rows == 1   # only 1 valid row
        error_reasons = [e["reason"] for e in result.errors]
        assert any("name" in r for r in error_reasons)

    def test_empty_file_returns_error(self, empty_xlsx):
        result = ExcelParser().parse(empty_xlsx)
        assert result.total_rows == 0
        assert len(result.errors) > 0


class TestExcelParserConfig:
    def test_explicit_header_row(self, standard_xlsx):
        config = ParserConfig(header_row=0)
        result = ExcelParser(config).parse(standard_xlsx)
        assert result.total_rows == 3

    def test_explicit_column_mapping_by_letter(self, standard_xlsx):
        config = ParserConfig(
            header_row=0,
            column_mapping={"code": "A", "name": "B", "unit": "C", "price": "D"},
        )
        result = ExcelParser(config).parse(standard_xlsx)
        assert result.total_rows == 3
        assert result.rows[0].supplier_product_code == "LAC-001"


class TestExcelParserToDict:
    def test_to_dict_matches_contract(self, standard_xlsx):
        result = ExcelParser().parse(standard_xlsx)
        d = result.to_dict()
        assert "parser" in d
        assert "version" in d
        assert "source_file" in d
        assert "total_rows" in d
        assert "rows" in d
        assert "errors" in d
        assert isinstance(d["rows"], list)
        assert d["rows"][0]["unit_cost"] == 1500.50
