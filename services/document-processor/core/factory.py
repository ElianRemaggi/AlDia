from __future__ import annotations

from pathlib import Path

from core.models import ParserConfig
from parsers.base import BaseParser


def select_parser(filepath: str, config: ParserConfig | None = None) -> BaseParser:
    """Return the appropriate parser instance based on file extension."""
    # Import here to avoid circular imports at module level
    from parsers.csv_parser import CsvParser
    from parsers.excel_parser import ExcelParser
    from parsers.pdf_parser import PdfParser

    extension_map: dict[str, type[BaseParser]] = {
        ".xlsx": ExcelParser,
        ".xls": ExcelParser,
        ".csv": CsvParser,
        ".pdf": PdfParser,
    }

    ext = Path(filepath).suffix.lower()
    parser_cls = extension_map.get(ext)

    if parser_cls is None:
        supported = ", ".join(extension_map.keys())
        raise ValueError(
            f"Unsupported file type '{ext}'. Supported types: {supported}"
        )

    return parser_cls(config)
