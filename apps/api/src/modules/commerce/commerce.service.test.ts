import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createCommerceFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import { list, getById, create, update } from './commerce.service';

describe('commerce.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('list', () => {
    it('should return all commerces ordered by createdAt DESC', async () => {
      const commerces = [createCommerceFixture()];
      mockRepo.find.mockResolvedValue(commerces);

      const result = await list();

      expect(mockRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual(commerces);
    });
  });

  describe('getById', () => {
    it('should return commerce when found', async () => {
      const commerce = createCommerceFixture();
      mockRepo.findOne.mockResolvedValue(commerce);

      const result = await getById('commerce-uuid-1');

      expect(result).toEqual(commerce);
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getById('nonexistent')).rejects.toThrow('Commerce not found');
    });
  });

  describe('create', () => {
    it('should create and save a new commerce', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id', createdAt: new Date(), updatedAt: new Date(),
      }));

      const result = await create({ name: 'New Commerce', identifier: 'new' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Commerce', identifier: 'new' }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw 409 when identifier already in use', async () => {
      mockRepo.findOne.mockResolvedValue(createCommerceFixture());

      await expect(create({ name: 'Dup', identifier: 'test-commerce' }))
        .rejects.toThrow('Identifier already in use');
    });

    it('should handle null optional fields', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await create({ name: 'Minimal' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: null, email: null, phone: null }),
      );
    });
  });

  describe('update', () => {
    it('should update and save commerce', async () => {
      const commerce = createCommerceFixture();
      mockRepo.findOne.mockResolvedValue(commerce);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await update('commerce-uuid-1', { name: 'Updated' });

      expect(result).toHaveProperty('name', 'Updated');
    });

    it('should throw 409 when identifier conflicts with another commerce', async () => {
      const existing = createCommerceFixture();
      const other = createCommerceFixture({ id: 'other-id', identifier: 'taken' });

      // First call: getById returns the commerce being updated
      // Second call: check identifier uniqueness returns another commerce
      mockRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(other);

      await expect(update('commerce-uuid-1', { identifier: 'taken' }))
        .rejects.toThrow('Identifier already in use');
    });

    it('should allow updating with same identifier', async () => {
      const commerce = createCommerceFixture({ identifier: 'same' });
      mockRepo.findOne
        .mockResolvedValueOnce(commerce) // getById
        .mockResolvedValueOnce(commerce); // uniqueness check (same record)
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await update('commerce-uuid-1', { identifier: 'same' });

      expect(result).toHaveProperty('identifier', 'same');
    });
  });
});
