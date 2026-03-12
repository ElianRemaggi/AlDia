export function createUserFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    role: 'commerce' as const,
    commerceId: 'commerce-uuid-1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    ...overrides,
  };
}

export function createCommerceFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'commerce-uuid-1',
    name: 'Test Commerce',
    identifier: 'test-commerce',
    email: 'commerce@example.com',
    phone: '+541122334455',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [],
    suppliers: [],
    ...overrides,
  };
}

export function createSupplierFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'supplier-uuid-1',
    commerceId: 'commerce-uuid-1',
    name: 'Test Supplier',
    supplierCode: 'SUP-001',
    description: null,
    contactName: 'John Doe',
    contactEmail: 'john@supplier.com',
    contactPhone: '+541199887766',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    ...overrides,
  };
}
