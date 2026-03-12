from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ParserConfig:
    """Configuration for a parser run. All fields are optional; None means auto-detect."""

    header_row: int | None = None
    # Maps logical field → column letter ("A") or header name ("Precio")
    column_mapping: dict[str, str] | None = None
    skip_rows: list[int] = field(default_factory=list)
    # "decimal_point" → 1500.50 | "decimal_comma" → 1.500,50
    price_format: str = "decimal_point"
    encoding: str = "utf-8"

    @classmethod
    def from_dict(cls, data: dict) -> "ParserConfig":
        return cls(
            header_row=data.get("header_row"),
            column_mapping=data.get("column_mapping"),
            skip_rows=data.get("skip_rows", []),
            price_format=data.get("price_format", "decimal_point"),
            encoding=data.get("encoding", "utf-8"),
        )


@dataclass
class ParsedRow:
    position_index: int
    raw_name: str
    unit_cost: float
    currency: str = "ARS"
    supplier_product_code: str | None = None
    unit: str | None = None
    brand: str | None = None
    category: str | None = None

    def to_dict(self) -> dict:
        return {
            "position_index": self.position_index,
            "raw_name": self.raw_name,
            "supplier_product_code": self.supplier_product_code,
            "unit": self.unit,
            "unit_cost": self.unit_cost,
            "currency": self.currency,
            "brand": self.brand,
            "category": self.category,
        }


@dataclass
class ParseResult:
    parser: str
    version: str
    source_file: str
    total_rows: int
    rows: list[ParsedRow]
    errors: list[dict]

    def to_dict(self) -> dict:
        return {
            "parser": self.parser,
            "version": self.version,
            "source_file": Path(self.source_file).name,
            "total_rows": self.total_rows,
            "rows": [r.to_dict() for r in self.rows],
            "errors": self.errors,
        }
