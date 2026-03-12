import { z } from 'zod';
import { MarkupScopeType } from './entities/markup-rule.entity';

export const createMarkupRuleSchema = z.object({
  scopeType: z.nativeEnum(MarkupScopeType),
  supplierId: z.string().uuid().optional(),
  supplierProductId: z.string().uuid().optional(),
  commerceProductId: z.string().uuid().optional(),
  markupPercentage: z.number().min(0).max(1000),
});

export const updateMarkupRuleSchema = z.object({
  markupPercentage: z.number().min(0).max(1000),
});

export const bulkUpdateMarkupSchema = z.object({
  rules: z.array(createMarkupRuleSchema),
});

export type CreateMarkupRuleDto = z.infer<typeof createMarkupRuleSchema>;
export type UpdateMarkupRuleDto = z.infer<typeof updateMarkupRuleSchema>;
export type BulkUpdateMarkupDto = z.infer<typeof bulkUpdateMarkupSchema>;
