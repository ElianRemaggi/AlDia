import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createMarkupRuleFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  listMarkupRules,
  createMarkupRule,
  updateMarkupRule,
  deleteMarkupRule,
  bulkUpdateMarkupRules,
  resolveMarkup,
  pickMarkupRule,
  applyMarkup,
} from './markup.service';
import type { MarkupRule } from './entities/markup-rule.entity';
import { MarkupScopeType } from './entities/markup-rule.entity';

describe('markup.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('listMarkupRules', () => {
    it('should return all rules for a commerce', async () => {
      const rules = [createMarkupRuleFixture()];
      mockRepo.find.mockResolvedValue(rules);

      const result = await listMarkupRules('commerce-uuid-1');

      expect(result).toEqual(rules);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { commerceId: 'commerce-uuid-1' } });
    });
  });

  describe('createMarkupRule', () => {
    it('should create a supplier-scoped markup rule', async () => {
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => ({ ...e as object, id: 'new-rule' }));

      const result = await createMarkupRule('commerce-uuid-1', {
        scopeType: MarkupScopeType.SUPPLIER,
        supplierId: 'supplier-uuid-1',
        markupPercentage: 25,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: 'commerce-uuid-1',
          scopeType: MarkupScopeType.SUPPLIER,
          supplierId: 'supplier-uuid-1',
          markupPercentage: '25',
        }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should set optional fields to null when not provided', async () => {
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await createMarkupRule('commerce-uuid-1', {
        scopeType: MarkupScopeType.SUPPLIER,
        supplierId: 'supplier-uuid-1',
        markupPercentage: 10,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierProductId: null,
          commerceProductId: null,
        }),
      );
    });
  });

  describe('updateMarkupRule', () => {
    it('should update markup percentage', async () => {
      const rule = createMarkupRuleFixture({ markupPercentage: '10.00' });
      mockRepo.findOne.mockResolvedValue(rule);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await updateMarkupRule('rule-uuid-1', 'commerce-uuid-1', {
        markupPercentage: 30,
      });

      expect(result).toHaveProperty('markupPercentage', '30');
    });

    it('should throw 404 when rule not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        updateMarkupRule('bad-id', 'commerce-uuid-1', { markupPercentage: 10 }),
      ).rejects.toThrow('Markup rule not found');
    });
  });

  describe('deleteMarkupRule', () => {
    it('should delete the rule', async () => {
      const rule = createMarkupRuleFixture();
      mockRepo.findOne.mockResolvedValue(rule);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await deleteMarkupRule('rule-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: rule.id });
    });

    it('should throw 404 when rule not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(deleteMarkupRule('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Markup rule not found',
      );
    });
  });

  describe('bulkUpdateMarkupRules', () => {
    it('should delete all existing rules and create new ones', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 2 });
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => (Array.isArray(e) ? e : [e]));

      const dto = {
        rules: [
          { scopeType: MarkupScopeType.SUPPLIER, supplierId: 's-1', markupPercentage: 20 },
          { scopeType: MarkupScopeType.SUPPLIER_PRODUCT, supplierProductId: 'sp-1', markupPercentage: 30 },
        ],
      };

      await bulkUpdateMarkupRules('commerce-uuid-1', dto);

      expect(mockRepo.delete).toHaveBeenCalledWith({ commerceId: 'commerce-uuid-1' });
      expect(mockRepo.create).toHaveBeenCalledTimes(2);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('resolveMarkup', () => {
    it('should return supplier_product rule as highest priority', async () => {
      const supplierProductRule = createMarkupRuleFixture({
        scopeType: MarkupScopeType.SUPPLIER_PRODUCT,
        supplierProductId: 'sp-uuid-1',
        supplierId: null,
        commerceProductId: null,
      });
      const supplierRule = createMarkupRuleFixture({
        id: 'rule-uuid-2',
        scopeType: MarkupScopeType.SUPPLIER,
        supplierId: 'supplier-uuid-1',
        supplierProductId: null,
        commerceProductId: null,
        markupPercentage: '15.00',
      });
      mockRepo.find.mockResolvedValue([supplierProductRule, supplierRule]);

      const result = await resolveMarkup(
        'commerce-uuid-1',
        'supplier-uuid-1',
        'sp-uuid-1',
      );

      expect(result).toEqual(supplierProductRule);
    });

    it('should return commerce_product rule when no supplier_product rule', async () => {
      const commerceProductRule = createMarkupRuleFixture({
        id: 'rule-uuid-cp',
        scopeType: MarkupScopeType.COMMERCE_PRODUCT,
        commerceProductId: 'cp-uuid-1',
        supplierProductId: null,
        supplierId: null,
      });
      const supplierRule = createMarkupRuleFixture({
        id: 'rule-uuid-s',
        scopeType: MarkupScopeType.SUPPLIER,
        supplierId: 'supplier-uuid-1',
        supplierProductId: null,
        commerceProductId: null,
        markupPercentage: '15.00',
      });
      mockRepo.find.mockResolvedValue([commerceProductRule, supplierRule]);

      const result = await resolveMarkup(
        'commerce-uuid-1',
        'supplier-uuid-1',
        'sp-uuid-different',
        'cp-uuid-1',
      );

      expect(result).toEqual(commerceProductRule);
    });

    it('should return supplier rule as lowest priority', async () => {
      const supplierRule = createMarkupRuleFixture({
        scopeType: MarkupScopeType.SUPPLIER,
        supplierId: 'supplier-uuid-1',
        supplierProductId: null,
        commerceProductId: null,
      });
      mockRepo.find.mockResolvedValue([supplierRule]);

      const result = await resolveMarkup(
        'commerce-uuid-1',
        'supplier-uuid-1',
        'sp-uuid-1',
      );

      expect(result).toEqual(supplierRule);
    });

    it('should return null when no matching rule exists', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await resolveMarkup(
        'commerce-uuid-1',
        'supplier-uuid-1',
        'sp-uuid-1',
      );

      expect(result).toBeNull();
    });

    it('should skip commerce_product priority when no commerceProductId provided', async () => {
      const commerceProductRule = createMarkupRuleFixture({
        id: 'rule-uuid-cp',
        scopeType: MarkupScopeType.COMMERCE_PRODUCT,
        commerceProductId: 'cp-uuid-1',
        supplierProductId: null,
        supplierId: null,
      });
      mockRepo.find.mockResolvedValue([commerceProductRule]);

      const result = await resolveMarkup(
        'commerce-uuid-1',
        'supplier-uuid-1',
        'sp-uuid-1',
        // no commerceProductId
      );

      expect(result).toBeNull();
    });
  });
  describe('pickMarkupRule', () => {
    const target = { supplierId: 'supplier-uuid-1', supplierProductId: 'sp-1', commerceProductId: 'cp-1' };
    const supplierRule = createMarkupRuleFixture({ markupPercentage: '10.00' }) as unknown as MarkupRule;
    const commerceProductRule = createMarkupRuleFixture({
      scopeType: MarkupScopeType.COMMERCE_PRODUCT,
      supplierId: null,
      commerceProductId: 'cp-1',
      markupPercentage: '20.00',
    }) as unknown as MarkupRule;
    const supplierProductRule = createMarkupRuleFixture({
      scopeType: MarkupScopeType.SUPPLIER_PRODUCT,
      supplierId: null,
      supplierProductId: 'sp-1',
      markupPercentage: '30.00',
    }) as unknown as MarkupRule;

    it('should follow supplier_product > commerce_product > supplier', () => {
      const all = [supplierRule, commerceProductRule, supplierProductRule];
      expect(pickMarkupRule(all, target)).toBe(supplierProductRule);
      expect(pickMarkupRule([supplierRule, commerceProductRule], target)).toBe(commerceProductRule);
      expect(pickMarkupRule([supplierRule], target)).toBe(supplierRule);
    });

    it('should ignore commerce_product rules when the product is not linked', () => {
      expect(
        pickMarkupRule([supplierRule, commerceProductRule], { ...target, commerceProductId: null }),
      ).toBe(supplierRule);
    });

    it('should return null when nothing matches', () => {
      expect(pickMarkupRule([supplierRule], { ...target, supplierId: 'other' })).toBeNull();
    });
  });

  describe('applyMarkup', () => {
    const rule = (pct: string) =>
      createMarkupRuleFixture({ markupPercentage: pct }) as unknown as MarkupRule;

    it('should compute sale price rounded to cents', () => {
      expect(applyMarkup('1000.00', rule('30.00'))).toEqual({ markupPercentage: 30, salePrice: 1300 });
      expect(applyMarkup('99.99', rule('33.33'))).toEqual({ markupPercentage: 33.33, salePrice: 133.32 });
    });

    it('should return nulls when there is no rule or no cost', () => {
      expect(applyMarkup('1000.00', null)).toEqual({ markupPercentage: null, salePrice: null });
      expect(applyMarkup(null, rule('30.00'))).toEqual({ markupPercentage: 30, salePrice: null });
    });
  });
});
