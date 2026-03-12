import { vi } from 'vitest';

export function createMockRepository() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    findAndCount: vi.fn(),
    save: vi.fn(),
    create: vi.fn().mockImplementation((data: unknown) => ({ ...data as object })),
    delete: vi.fn(),
    count: vi.fn(),
  };
}
