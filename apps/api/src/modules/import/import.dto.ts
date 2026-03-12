import { z } from 'zod';

export const uploadPriceListSchema = z.object({
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

export const listPriceListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'processed', 'failed', 'partially_processed']).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type UploadPriceListDto = z.infer<typeof uploadPriceListSchema>;
export type ListPriceListsQuery = z.infer<typeof listPriceListsQuerySchema>;
