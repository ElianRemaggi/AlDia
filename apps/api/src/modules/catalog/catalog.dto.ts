import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  favoritesOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
