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

export async function resolveMarkup(
  commerceId: string,
  supplierId: string,
  supplierProductId: string,
  commerceProductId?: string,
): Promise<MarkupRule | null> {
  const rules = await markupRuleRepo().find({ where: { commerceId } });

  // Priority 1: supplier_product rule matching supplierProductId
  const supplierProductRule = rules.find(
    (r) =>
      r.scopeType === MarkupScopeType.SUPPLIER_PRODUCT &&
      r.supplierProductId === supplierProductId,
  );
  if (supplierProductRule) return supplierProductRule;

  // Priority 2: commerce_product rule matching commerceProductId (if provided)
  if (commerceProductId) {
    const commerceProductRule = rules.find(
      (r) =>
        r.scopeType === MarkupScopeType.COMMERCE_PRODUCT &&
        r.commerceProductId === commerceProductId,
    );
    if (commerceProductRule) return commerceProductRule;
  }

  // Priority 3: supplier rule matching supplierId
  const supplierRule = rules.find(
    (r) => r.scopeType === MarkupScopeType.SUPPLIER && r.supplierId === supplierId,
  );
  if (supplierRule) return supplierRule;

  return null;
}
