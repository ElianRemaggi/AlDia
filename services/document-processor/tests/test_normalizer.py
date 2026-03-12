import pytest
from core.normalizer import normalize_price


class TestDecimalPoint:
    def test_plain_integer(self):
        assert normalize_price("1500") == 1500.0

    def test_decimal_price(self):
        assert normalize_price("1500.50") == 1500.50

    def test_thousands_comma(self):
        assert normalize_price("1,500.50") == 1500.50

    def test_integer_numeric(self):
        assert normalize_price(1500) == 1500.0

    def test_float_numeric(self):
        assert normalize_price(1500.5) == 1500.5

    def test_currency_symbol(self):
        assert normalize_price("$1,500.50") == 1500.50

    def test_whitespace_stripped(self):
        assert normalize_price("  1500.50  ") == 1500.50

    def test_none_returns_none(self):
        assert normalize_price(None) is None

    def test_empty_string_returns_none(self):
        assert normalize_price("") is None

    def test_non_numeric_returns_none(self):
        assert normalize_price("N/A") is None

    def test_negative_returns_none(self):
        assert normalize_price(-100) is None


class TestDecimalComma:
    def test_ars_format_with_dots_and_comma(self):
        assert normalize_price("1.500,50", "decimal_comma") == 1500.50

    def test_ars_format_no_thousands(self):
        assert normalize_price("1500,50", "decimal_comma") == 1500.50

    def test_ars_with_currency_symbol(self):
        assert normalize_price("$1.500,50", "decimal_comma") == 1500.50

    def test_integer_with_dot_thousands(self):
        # "1.500" with decimal_comma → thousands dot → 1500
        assert normalize_price("1.500", "decimal_comma") == 1500.0

    def test_plain_integer(self):
        assert normalize_price("2200", "decimal_comma") == 2200.0

    def test_none_returns_none(self):
        assert normalize_price(None, "decimal_comma") is None


class TestEdgeCases:
    def test_zero_is_valid(self):
        assert normalize_price(0) == 0.0

    def test_zero_string(self):
        assert normalize_price("0") == 0.0

    def test_large_price(self):
        assert normalize_price("999999.99") == 999999.99
