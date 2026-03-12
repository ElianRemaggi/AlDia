import { z } from 'zod';

export const createCommerceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  identifier: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
});

export const updateCommerceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  identifier: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCommerceDto = z.infer<typeof createCommerceSchema>;
export type UpdateCommerceDto = z.infer<typeof updateCommerceSchema>;
