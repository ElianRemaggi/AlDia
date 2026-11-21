import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  category: z.string().trim().min(1).optional(),
  // Matches product name or supplier product code
  search: z.string().trim().min(1).optional(),
  favoritesOnly: booleanFlag,
  // Only products whose price changed in the last RECENT_CHANGE_DAYS days
  hasRecentChange: booleanFlag,
  sortBy: z.enum(['name', 'price', 'change']).default('name'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
