import { Job } from 'bullmq';
import { AppDataSource } from '../../config/data-source';
import { documentProcessingEvents, documentProcessingQueue } from './import.queue';
import { JobResult, ParseDocumentJobData } from './import.types';
import { PriceList, PriceListStatus } from './entities/price-list.entity';
import { ImportJob, ImportJobStatus } from './entities/import-job.entity';
import * as processor from './import.processor';

/**
 * Python picked the job up. Conditional updates: event handlers run concurrently,
 * so a fast job's 'completed' handler may already have written the final status.
 */
export async function onJobActive(priceListId: string): Promise<void> {
  await AppDataSource.getRepository(ImportJob).update(
    { priceListId, status: ImportJobStatus.QUEUED },
    { status: ImportJobStatus.RUNNING, startedAt: new Date() },
  );
  await AppDataSource.getRepository(PriceList).update(
    { id: priceListId, status: PriceListStatus.PENDING },
    { status: PriceListStatus.PROCESSING },
  );
}

/** Python finished parsing (its own result may still be `failed`). */
export async function onJobCompleted(result: JobResult): Promise<void> {
  const { priceListId, status, parseResult, errorMessage } = result;

  if (status === 'failed' || !parseResult) {
    await processor.updatePriceListStatus(priceListId, PriceListStatus.FAILED);
    await processor.updateImportJobStatus(
      priceListId,
      ImportJobStatus.FAILED,
      errorMessage ?? 'Parse failed',
    );
    await processor.notifyImportFailed(priceListId, errorMessage ?? 'Parse failed');
    return;
  }

  try {
    await processor.saveParseResult(priceListId, parseResult);

    const priceList = await AppDataSource.getRepository(PriceList).findOneOrFail({
      where: { id: priceListId },
    });

    // Match or create a SupplierProduct for each parsed row, keyed by position_index
    const productMap = new Map();
    for (const row of parseResult.rows) {
      const product = await processor.matchOrCreateProduct(
        priceList.supplierId,
        priceList.commerceId,
        row,
      );
      productMap.set(row.position_index, product);
    }

    await processor.createPriceListItems(priceListId, parseResult.rows, productMap);
    await processor.detectPriceChanges(priceListId, priceList.supplierId, priceList.commerceId);
    await processor.generateNotifications(priceList.commerceId, priceListId);

    const finalStatus =
      parseResult.errors.length > 0
        ? PriceListStatus.PARTIALLY_PROCESSED
        : PriceListStatus.PROCESSED;

    await processor.updatePriceListStatus(priceListId, finalStatus, new Date());
    await processor.updateImportJobStatus(priceListId, ImportJobStatus.COMPLETED, undefined, {
      parser: parseResult.parser,
      total_rows: parseResult.total_rows,
      error_count: parseResult.errors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await processor.updatePriceListStatus(priceListId, PriceListStatus.FAILED);
    await processor.updateImportJobStatus(priceListId, ImportJobStatus.FAILED, msg);
    await processor.notifyImportFailed(priceListId, msg);
  }
}

/** The job crashed in Python and BullMQ gave up on it (no retries left). */
export async function onJobFailed(priceListId: string, reason: string): Promise<void> {
  await processor.updatePriceListStatus(priceListId, PriceListStatus.FAILED);
  await processor.updateImportJobStatus(priceListId, ImportJobStatus.FAILED, reason);
  await processor.notifyImportFailed(priceListId, reason);
}

/** BullMQ serializes return values as JSON strings in queue events. */
export function parseReturnValue(raw: unknown): JobResult | null {
  if (raw && typeof raw === 'object') return raw as JobResult;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as JobResult;
  } catch {
    return null;
  }
}

async function loadJob(jobId: string): Promise<Job<ParseDocumentJobData> | undefined> {
  return Job.fromId<ParseDocumentJobData>(documentProcessingQueue, jobId);
}

function logError(event: string, jobId: string, err: unknown) {
  console.error(`[import-events] ${event} handler failed for job ${jobId}:`, err);
}

/** Start listening to queue-wide job events. Call once, after the DB is connected. */
export function startImportEvents(): void {
  documentProcessingEvents.on('active', async ({ jobId }) => {
    try {
      const job = await loadJob(jobId);
      if (job) await onJobActive(job.data.priceListId);
    } catch (err) {
      logError('active', jobId, err);
    }
  });

  documentProcessingEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
      const result = parseReturnValue(returnvalue);
      if (result) {
        await onJobCompleted(result);
        return;
      }
      const job = await loadJob(jobId);
      if (job) await onJobFailed(job.data.priceListId, 'Processor returned no result');
    } catch (err) {
      logError('completed', jobId, err);
    }
  });

  documentProcessingEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      const job = await loadJob(jobId);
      // 'failed' also fires for attempts that BullMQ will retry; only the final one counts.
      if (job && (await job.getState()) === 'failed') {
        await onJobFailed(job.data.priceListId, failedReason);
      }
    } catch (err) {
      logError('failed', jobId, err);
    }
  });

  void documentProcessingEvents.run();
}
