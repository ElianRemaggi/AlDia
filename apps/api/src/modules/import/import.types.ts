export interface ParseDocumentJobData {
  priceListId: string;
  supplierId: string;
  commerceId: string;
  fileUrl: string;       // signed GCS URL or absolute local path
  fileName: string;      // original filename
  sourceType: 'excel' | 'csv' | 'pdf';
  parserConfig: {
    header_row: number | null;
    column_mapping: Record<string, string> | null;
    skip_rows: number[];
    price_format: 'decimal_point' | 'decimal_comma';
    encoding: string;
  };
}

export interface ParsedRow {
  position_index: number;
  raw_name: string;
  supplier_product_code: string | null;
  unit: string | null;
  unit_cost: number;
  currency: string;
  brand: string | null;
  category: string | null;
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface ParseResult {
  parser: string;
  version: string;
  source_file: string;
  total_rows: number;
  rows: ParsedRow[];
  errors: ParseError[];
}

export interface JobResult {
  priceListId: string;
  status: 'success' | 'partial' | 'failed';
  parseResult: ParseResult | null;
  errorMessage: string | null;
}
