import fs from 'fs';
import path from 'path';
import { config } from '../../config';

export function getLocalUploadsDir(): string {
  const dir = path.resolve(config.storage.localUploadsDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Upload a file. In dev (no GCS configured) saves to local disk.
 * In prod saves to GCS and returns a gs:// URL.
 * Returns the fileUrl stored in price_list.source_file_url.
 */
export async function uploadFile(
  commerceId: string,
  supplierId: string,
  priceListId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (config.storage.useLocal) {
    return uploadLocal(commerceId, supplierId, priceListId, filename, buffer);
  }
  return uploadToGcs(commerceId, supplierId, priceListId, filename, buffer, mimeType);
}

/**
 * Get a URL the Python worker can use to download the file.
 * For local files: returns the absolute path.
 * For GCS files: returns a signed URL valid for 1 hour.
 */
export async function getFileUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('gs://')) {
    return getGcsSignedUrl(fileUrl);
  }
  // Local absolute path — Python worker detects it by the absence of http(s)://
  return fileUrl;
}

// ─── Local storage ──────────────────────────────────────────────────────────

function uploadLocal(
  commerceId: string,
  supplierId: string,
  priceListId: string,
  filename: string,
  buffer: Buffer,
): string {
  const dir = path.join(
    getLocalUploadsDir(),
    'commerces',
    commerceId,
    'suppliers',
    supplierId,
    priceListId,
  );
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ─── GCS storage ────────────────────────────────────────────────────────────

async function uploadToGcs(
  commerceId: string,
  supplierId: string,
  priceListId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  // Lazy-load @google-cloud/storage to avoid import errors when not configured
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ keyFilename: config.gcs.keyFile });
  const bucket = storage.bucket(config.gcs.bucketName);
  const key = `commerces/${commerceId}/suppliers/${supplierId}/${priceListId}/${filename}`;
  const file = bucket.file(key);
  await file.save(buffer, { contentType: mimeType });
  return `gs://${config.gcs.bucketName}/${key}`;
}

async function getGcsSignedUrl(gcsUrl: string, expiresInSeconds = 3600): Promise<string> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ keyFilename: config.gcs.keyFile });
  const bucket = storage.bucket(config.gcs.bucketName);
  const key = gcsUrl.replace(`gs://${config.gcs.bucketName}/`, '');
  const [url] = await bucket.file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
}
