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

export function createSupplierProductFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp-uuid-1',
    commerceId: 'commerce-uuid-1',
    supplierId: 'supplier-uuid-1',
    supplierProductCode: 'PROD-001',
    name: 'Test Product',
    description: null,
    unit: 'unidad',
    brand: null,
    category: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createPriceListFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-uuid-1',
    commerceId: 'commerce-uuid-1',
    supplierId: 'supplier-uuid-1',
    sourceType: 'excel' as const,
    sourceFileUrl: null,
    sourceFileName: 'lista.xlsx',
    uploadedByUserId: 'user-uuid-1',
    status: 'pending' as const,
    versionNumber: 1,
    effectiveDate: null,
    uploadedAt: new Date('2024-01-01'),
    processedAt: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createImportJobFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-uuid-1',
    priceListId: 'pl-uuid-1',
    jobType: 'parse_document' as const,
    status: 'queued' as const,
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    metaJson: null,
    createdAt: new Date('2024-01-01'),
    priceList: null,
    ...overrides,
  };
}

export function createCommerceProductFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cp-uuid-1',
    commerceId: 'commerce-uuid-1',
    name: 'Test Commerce Product',
    internalCode: null,
    description: null,
    category: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    ...overrides,
  };
}

export function createCommerceProductSupplierLinkFixture(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'link-uuid-1',
    commerceId: 'commerce-uuid-1',
    commerceProductId: 'cp-uuid-1',
    supplierProductId: 'sp-uuid-1',
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    commerceProduct: null,
    supplierProduct: null,
    ...overrides,
  };
}

export function createMarkupRuleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-uuid-1',
    commerceId: 'commerce-uuid-1',
    scopeType: 'supplier' as const,
    supplierId: 'supplier-uuid-1',
    supplierProductId: null,
    commerceProductId: null,
    markupPercentage: '20.00',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    ...overrides,
  };
}

export function createPurchaseListFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-uuid-1',
    commerceId: 'commerce-uuid-1',
    name: 'Test Purchase List',
    status: 'active' as const,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    commerce: null,
    items: [],
    ...overrides,
  };
}

export function createPurchaseListItemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-uuid-1',
    purchaseListId: 'pl-uuid-1',
    supplierProductId: 'sp-uuid-1',
    quantity: 1,
    unitCostSnapshot: '100.00',
    currency: 'ARS',
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    purchaseList: null,
    supplierProduct: null,
    ...overrides,
  };
}

export function createNotificationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-uuid-1',
    commerceId: 'commerce-uuid-1',
    type: 'import_finished' as const,
    title: 'Test Notification',
    message: 'Test notification message',
    isRead: false,
    metadataJson: null,
    createdAt: new Date('2024-01-01'),
    commerce: null,
    ...overrides,
  };
}
