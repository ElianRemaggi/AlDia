"""
LLM-based extraction of product rows from unstructured text.

Used by PdfParser when a PDF has no usable table structure. Talks to any
OpenAI-compatible chat API (DeepSeek by default).

The LLM is only trusted to *locate* fields, never to produce values:
prices are returned verbatim (`price_text`) and verified against the source
text by the caller, then normalized with core.normalizer.
"""
from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Protocol

SYSTEM_PROMPT = """\
Sos un extractor de datos de listas de precios de proveedores.
Recibís texto crudo extraído de un PDF (tablas, listados, columnas desalineadas).
Devolvé SOLO un JSON con la clave "items": una lista de objetos, uno por producto, en el orden en que aparecen.
Cada objeto tiene exactamente estos campos:
- "code": código del producto (código, cod, SKU, ref, art, id de artículo). null si no existe. NUNCA inventes uno.
- "name": nombre o descripción del producto, tal como aparece.
- "price_text": el precio unitario COPIADO TEXTUALMENTE del texto, sin modificar ningún carácter (ej: "$ 1.500,50", "2200"). null si no hay precio.
- "unit": unidad / presentación (kg, unidad, caja x 12...). null si no existe.
- "brand": marca. null si no existe.
- "category": categoría o rubro (a veces es un título de sección que agrupa productos). null si no existe.
Ignorá encabezados, totales, subtotales, notas, datos de contacto y pies de página.
Si una línea aparece cortada al principio o al final del texto, ignorala.
No inventes datos. No agregues campos. No des explicaciones."""

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"


@dataclass
class LlmSettings:
    api_key: str | None
    base_url: str = DEFAULT_BASE_URL
    model: str = DEFAULT_MODEL
    chunk_chars: int = 6000
    max_workers: int = 4
    timeout_seconds: float = 120.0

    @classmethod
    def from_env(cls) -> "LlmSettings":
        return cls(
            api_key=os.getenv("LLM_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL", DEFAULT_BASE_URL),
            model=os.getenv("LLM_MODEL", DEFAULT_MODEL),
            chunk_chars=int(os.getenv("LLM_CHUNK_CHARS", "6000")),
            max_workers=int(os.getenv("LLM_MAX_WORKERS", "4")),
        )


class ChatClient(Protocol):
    def complete(self, system: str, user: str) -> tuple[str, bool]:
        """Return (response content, truncated)."""
        ...


class OpenAICompatibleClient:
    def __init__(self, settings: LlmSettings) -> None:
        if not settings.api_key:
            raise ValueError(
                "PDF sin tabla detectable: se necesita extracción con IA pero falta LLM_API_KEY"
            )
        from openai import OpenAI

        self._client = OpenAI(
            api_key=settings.api_key,
            base_url=settings.base_url,
            timeout=settings.timeout_seconds,
        )
        self._model = settings.model

    def complete(self, system: str, user: str) -> tuple[str, bool]:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=8192,
        )
        choice = resp.choices[0]
        return choice.message.content or "", choice.finish_reason == "length"


@dataclass
class ChunkResult:
    index: int
    text: str
    items: list[dict]
    error: str | None = None


def chunk_lines(lines: list[str], max_chars: int) -> list[str]:
    """
    Group lines into chunks of at most ~max_chars without splitting a line.
    A single line longer than max_chars becomes its own chunk.
    """
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for line in lines:
        if current and size + len(line) + 1 > max_chars:
            chunks.append("\n".join(current))
            current, size = [], 0
        current.append(line)
        size += len(line) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks


CONTEXT_LINES = 8


def build_user_message(index: int, text: str, context: str) -> str:
    if index == 0:
        return f"Texto:\n{text}"
    return (
        "Primeras líneas del documento (solo como referencia de columnas, NO extraer productos de acá):\n"
        f"{context}\n\nTexto:\n{text}"
    )


def extract_items(
    lines: list[str],
    client: ChatClient,
    settings: LlmSettings,
) -> list[ChunkResult]:
    """Run the LLM over every chunk (in parallel) and return results in document order."""
    non_empty = [ln for ln in lines if ln.strip()]
    chunks = chunk_lines(non_empty, settings.chunk_chars)
    if not chunks:
        return []
    # Later chunks lose the column headers; give them the document's first lines as context.
    context = "\n".join(non_empty[:CONTEXT_LINES])

    def run(indexed: tuple[int, str]) -> ChunkResult:
        index, text = indexed
        try:
            content, truncated = client.complete(SYSTEM_PROMPT, build_user_message(index, text, context))
        except Exception as e:  # network / API errors — report, don't abort other chunks
            return ChunkResult(index, text, [], f"LLM request failed: {e}")
        if truncated:
            return ChunkResult(index, text, [], "LLM response truncated (max_tokens)")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return ChunkResult(index, text, [], "LLM returned invalid JSON")
        items = data.get("items") if isinstance(data, dict) else None
        if not isinstance(items, list):
            return ChunkResult(index, text, [], "LLM response missing 'items' list")
        return ChunkResult(index, text, [i for i in items if isinstance(i, dict)])

    workers = max(1, min(settings.max_workers, len(chunks)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(run, enumerate(chunks)))
