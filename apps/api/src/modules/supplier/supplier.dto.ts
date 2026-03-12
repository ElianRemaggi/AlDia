import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  supplierCode: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  supplierCode: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
