import { documentProcessingWorker } from './import.queue';
import { JobResult } from './import.types';
import { PriceListStatus } from './entities/price-list.entity';
import { ImportJobStatus } from './entities/import-job.entity';
import * as processor from './import.processor';

documentProcessingWorker.on('completed', async (job) => {
  const returnValue = (job.returnvalue ?? {}) as JobResult;
  const { priceListId, status, parseResult, errorMessage } = returnValue;

  if (status === 'failed' || !parseResult) {
    await processor.updatePriceListStatus(priceListId, PriceListStatus.FAILED);
    await processor.updateImportJobStatus(
      priceListId,
      ImportJobStatus.FAILED,
      errorMessage ?? 'Parse failed',
    );
    return;
  }

  try {
    await processor.updateImportJobStatus(priceListId, ImportJobStatus.RUNNING);
    await processor.saveParseResult(priceListId, parseResult);

    // Load the price list to get supplierId/commerceId for downstream operations
    const { AppDataSource } = await import('../../config/data-source');
    const { PriceList } = await import('./entities/price-list.entity');
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
    await processor.updateImportJobStatus(priceListId, ImportJobStatus.COMPLETED);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await processor.updatePriceListStatus(priceListId, PriceListStatus.FAILED);
    await processor.updateImportJobStatus(priceListId, ImportJobStatus.FAILED, msg);
  }
});

documentProcessingWorker.on('failed', async (job, error) => {
  if (job) {
    await processor.updatePriceListStatus(job.data.priceListId, PriceListStatus.FAILED);
    await processor.updateImportJobStatus(
      job.data.priceListId,
      ImportJobStatus.FAILED,
      error.message,
    );
  }
});

// Start accepting completed/failed events from the Python worker
documentProcessingWorker.run();
