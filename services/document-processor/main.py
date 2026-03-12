#!/usr/bin/env python3
"""
Document Processor CLI

Usage:
  python main.py <filepath>
  python main.py <filepath> --pretty
  python main.py <filepath> --config config.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse Excel or CSV price lists and output normalized JSON."
    )
    parser.add_argument("filepath", help="Path to the file to parse (.xlsx, .xls, .csv)")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output",
    )
    parser.add_argument(
        "--config",
        metavar="CONFIG_FILE",
        help="Path to JSON parser config file (column_mapping, header_row, etc.)",
    )
    args = parser.parse_args()

    filepath = Path(args.filepath)
    if not filepath.exists():
        print(f"Error: file not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    # Load optional parser config
    config = None
    if args.config:
        config_path = Path(args.config)
        if not config_path.exists():
            print(f"Error: config file not found: {config_path}", file=sys.stderr)
            sys.exit(1)
        with open(config_path, encoding="utf-8") as f:
            from core.models import ParserConfig
            config = ParserConfig.from_dict(json.load(f))

    # Select and run parser
    try:
        from core.factory import select_parser
        parser_instance = select_parser(str(filepath), config)
        result = parser_instance.parse(str(filepath))
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error while parsing: {e}", file=sys.stderr)
        sys.exit(2)

    indent = 2 if args.pretty else None
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=indent))


if __name__ == "__main__":
    main()
