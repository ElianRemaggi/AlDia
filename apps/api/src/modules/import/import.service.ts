import { AppDataSource } from '../../config/data-source';
import { PriceList, PriceListSourceType, PriceListStatus } from './entities/price-list.entity';
import { ImportJob, ImportJobType, ImportJobStatus } from './entities/import-job.entity';
import { AppError } from '../../shared/middleware';
import { uploadFile, getFileUrl } from '../../shared/storage/storage';
import { documentProcessingQueue } from './import.queue';
import { ParseDocumentJobData } from './import.types';
import type { ListPriceListsQuery, UploadPriceListDto } from './import.dto';

const priceListRepo = () => AppDataSource.getRepository(PriceList);
const importJobRepo = () => AppDataSource.getRepository(ImportJob);

function resolveSourceType(filename: string): PriceListSourceType {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext === '.xlsx' || ext === '.xls') return PriceListSourceType.EXCEL;
  if (ext === '.csv') return PriceListSourceType.CSV;
  if (ext === '.pdf') return PriceListSourceType.PDF;
  throw new AppError('Unsupported file type. Allowed: xlsx, xls, csv, pdf', 422);
}

async function computeNextVersionNumber(supplierId: string, commerceId: string): Promise<number> {
  const result = await priceListRepo()
    .createQueryBuilder('pl')
    .select('MAX(pl.versionNumber)', 'max')
    .where('pl.supplierId = :supplierId AND pl.commerceId = :commerceId', { supplierId, commerceId })
    .getRawOne<{ max: number | null }>();

  return (result?.max ?? 0) + 1;
}

export async function uploadPriceList(
  supplierId: string,
  commerceId: string,
  userId: string,
  file: Express.Multer.File,
  dto: UploadPriceListDto,
): Promise<{ priceList: PriceList; importJob: ImportJob }> {
  const sourceType = resolveSourceType(file.originalname);
  const versionNumber = await computeNextVersionNumber(supplierId, commerceId);

  // Step 1: create price_list with pending status to obtain the ID
  const priceListDraft = priceListRepo().create({
    commerceId,
    supplierId,
    uploadedByUserId: userId,
    sourceType,
    sourceFileUrl: null,
    sourceFileName: file.originalname,
    status: PriceListStatus.PENDING,
    versionNumber,
    effectiveDate: dto.effectiveDate ?? null,
    notes: dto.notes ?? null,
  });
  // Use the returned entity — TypeORM populates the generated id on the returned value
  const priceList = await priceListRepo().save(priceListDraft);

  // Step 2: upload file now that we have the priceList.id
  const fileUrl = await uploadFile(
    commerceId,
    supplierId,
    priceList.id,
    file.originalname,
    file.buffer,
    file.mimetype,
  );

  // Step 3: persist the storage URL
  priceList.sourceFileUrl = fileUrl;
  await priceListRepo().save(priceList);

  // Step 4: create the import_job record
  const importJob = importJobRepo().create({
    priceListId: priceList.id,
    jobType: ImportJobType.PARSE_DOCUMENT,
    status: ImportJobStatus.QUEUED,
  });
  await importJobRepo().save(importJob);

  // Step 5: get a downloadable URL for the Python worker
  const downloadableUrl = await getFileUrl(fileUrl);

  // Step 6: enqueue the BullMQ job
  const jobData: ParseDocumentJobData = {
    priceListId: priceList.id,
    supplierId,
    commerceId,
    fileUrl: downloadableUrl,
    fileName: file.originalname,
    sourceType: sourceType as ParseDocumentJobData['sourceType'],
    parserConfig: {
      header_row: null,
      column_mapping: null,
      skip_rows: [],
      price_format: 'decimal_point',
      encoding: 'utf-8',
    },
  };

  await documentProcessingQueue.add('parse-document', jobData, {
    jobId: importJob.id,
  });

  return { priceList, importJob };
}

export async function listPriceLists(
  supplierId: string,
  commerceId: string,
  query: ListPriceListsQuery,
): Promise<{
  data: PriceList[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const { page, limit, status, sortOrder } = query;

  const where: Record<string, unknown> = { supplierId, commerceId };
  if (status !== undefined) {
    where.status = status;
  }

  const [data, total] = await priceListRepo().findAndCount({
    where,
    order: { createdAt: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPriceList(
  id: string,
  supplierId: string,
  commerceId: string,
): Promise<PriceList> {
  const priceList = await priceListRepo().findOne({ where: { id, supplierId, commerceId } });
  if (!priceList) {
    throw new AppError('Price list not found', 404);
  }
  return priceList;
}

export async function getImportJob(id: string, commerceId: string): Promise<ImportJob> {
  const job = await importJobRepo().findOne({ where: { id }, relations: ['priceList'] });
  if (!job || job.priceList.commerceId !== commerceId) {
    throw new AppError('Import job not found', 404);
  }
  return job;
}
