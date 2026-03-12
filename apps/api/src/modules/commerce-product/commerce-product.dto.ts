import { z } from 'zod';

export const createCommerceProductSchema = z.object({
  name: z.string().min(1).max(500),
  internalCode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const updateCommerceProductSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  internalCode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const addSupplierLinkSchema = z.object({
  supplierProductId: z.string().uuid(),
  isFavorite: z.boolean().optional(),
});

export type CreateCommerceProductDto = z.infer<typeof createCommerceProductSchema>;
export type UpdateCommerceProductDto = z.infer<typeof updateCommerceProductSchema>;
export type AddSupplierLinkDto = z.infer<typeof addSupplierLinkSchema>;
