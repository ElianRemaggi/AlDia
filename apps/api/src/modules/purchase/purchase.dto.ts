import { z } from 'zod';
import { PurchaseListStatus } from './entities/purchase-list.entity';

export const createPurchaseListSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
});

export const updatePurchaseListSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(PurchaseListStatus).optional(),
  notes: z.string().optional(),
});

export const addPurchaseItemSchema = z.object({
  supplierProductId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export const updatePurchaseItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

export type CreatePurchaseListDto = z.infer<typeof createPurchaseListSchema>;
export type UpdatePurchaseListDto = z.infer<typeof updatePurchaseListSchema>;
export type AddPurchaseItemDto = z.infer<typeof addPurchaseItemSchema>;
export type UpdatePurchaseItemDto = z.infer<typeof updatePurchaseItemSchema>;
