import { AppDataSource } from '../../config/data-source';
import { MarkupRule, MarkupScopeType } from './entities/markup-rule.entity';
import { AppError } from '../../shared/middleware';
import { CreateMarkupRuleDto, UpdateMarkupRuleDto, BulkUpdateMarkupDto } from './markup.dto';

const markupRuleRepo = () => AppDataSource.getRepository(MarkupRule);

export async function listMarkupRules(commerceId: string): Promise<MarkupRule[]> {
  return markupRuleRepo().find({ where: { commerceId } });
}

export async function createMarkupRule(
  commerceId: string,
  dto: CreateMarkupRuleDto,
): Promise<MarkupRule> {
  const rule = markupRuleRepo().create({
    commerceId,
    scopeType: dto.scopeType,
    supplierId: dto.supplierId ?? null,
    supplierProductId: dto.supplierProductId ?? null,
    commerceProductId: dto.commerceProductId ?? null,
    markupPercentage: String(dto.markupPercentage),
  });
  return markupRuleRepo().save(rule);
}

export async function updateMarkupRule(
  id: string,
  commerceId: string,
  dto: UpdateMarkupRuleDto,
): Promise<MarkupRule> {
  const rule = await markupRuleRepo().findOne({ where: { id, commerceId } });
  if (!rule) {
    throw new AppError('Markup rule not found', 404);
  }
  rule.markupPercentage = String(dto.markupPercentage);
  return markupRuleRepo().save(rule);
}

export async function deleteMarkupRule(id: string, commerceId: string): Promise<void> {
  const rule = await markupRuleRepo().findOne({ where: { id, commerceId } });
  if (!rule) {
    throw new AppError('Markup rule not found', 404);
  }
  await markupRuleRepo().delete({ id });
}

export async function bulkUpdateMarkupRules(
  commerceId: string,
  dto: BulkUpdateMarkupDto,
): Promise<MarkupRule[]> {
  // Delete all existing rules for this commerce
  await markupRuleRepo().delete({ commerceId });

  // Create and save new rules
  const rules = dto.rules.map((ruleDto) =>
    markupRuleRepo().create({
      commerceId,
      scopeType: ruleDto.scopeType,
      supplierId: ruleDto.supplierId ?? null,
      supplierProductId: ruleDto.supplierProductId ?? null,
      commerceProductId: ruleDto.commerceProductId ?? null,
      markupPercentage: String(ruleDto.markupPercentage),
    }),
  );

  return markupRuleRepo().save(rules);
}

export interface MarkupTarget {
  supplierId: string;
  supplierProductId: string;
  commerceProductId?: string | null;
}

/**
 * Pick the rule that applies to a product, by precedence:
 * supplier_product → commerce_product → supplier. Pure: callers load the
 * commerce's rules once and reuse them for every product in a listing.
 */
export function pickMarkupRule(rules: MarkupRule[], target: MarkupTarget): MarkupRule | null {
  const { supplierId, supplierProductId, commerceProductId } = target;
  return (
    rules.find(
      (r) =>
        r.scopeType === MarkupScopeType.SUPPLIER_PRODUCT &&
        r.supplierProductId === supplierProductId,
    ) ??
    (commerceProductId
      ? rules.find(
          (r) =>
            r.scopeType === MarkupScopeType.COMMERCE_PRODUCT &&
            r.commerceProductId === commerceProductId,
        )
      : undefined) ??
    rules.find((r) => r.scopeType === MarkupScopeType.SUPPLIER && r.supplierId === supplierId) ??
    null
  );
}

/** sale_price = unit_cost × (1 + markup_percentage / 100), rounded to cents. */
export function applyMarkup(
  unitCost: string | number | null,
  rule: MarkupRule | null,
): { markupPercentage: number | null; salePrice: number | null } {
  const markupPercentage = rule ? Number(rule.markupPercentage) : null;
  if (unitCost === null || markupPercentage === null) {
    return { markupPercentage, salePrice: null };
  }
  const salePrice = Math.round(Number(unitCost) * (1 + markupPercentage / 100) * 100) / 100;
  return { markupPercentage, salePrice };
}

export async function resolveMarkup(
  commerceId: string,
  supplierId: string,
  supplierProductId: string,
  commerceProductId?: string,
): Promise<MarkupRule | null> {
  const rules = await listMarkupRules(commerceId);
  return pickMarkupRule(rules, { supplierId, supplierProductId, commerceProductId });
}
