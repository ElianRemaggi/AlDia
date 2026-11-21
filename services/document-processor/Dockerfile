# PriceHub document processor (BullMQ consumer). Build context: services/document-processor
FROM python:3.12-slim
# poppler + tesseract (spa): OCR fallback for scanned PDFs in parsers/pdf_parser.py
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-spa \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Same uid as the API's "node" user, which writes the shared uploads volume.
RUN useradd --uid 1000 --create-home app
USER app
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "worker.bullmq_worker"]
