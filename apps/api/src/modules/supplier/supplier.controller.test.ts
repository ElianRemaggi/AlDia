import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createMockRequest, createMockResponse } from '../../test/mocks/mock-express';

vi.mock('./supplier.service');
import * as supplierService from './supplier.service';
import {
  listHandler,
  getByIdHandler,
  createHandler,
  updateHandler,
  deleteHandler,
} from './supplier.controller';

describe('supplier.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listHandler should throw 400 when commerceId missing', async () => {
    const req = createMockRequest({ query: {} }) as Request;
    const res = createMockResponse() as Response;

    await expect(listHandler(req, res)).rejects.toThrow('Commerce scope required');
  });

  it('listHandler should return paginated data', async () => {
    const result = { data: [{ id: '1' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
    vi.mocked(supplierService.list).mockResolvedValue(result as never);

    const req = createMockRequest({
      commerceId: 'c1',
      query: { page: '1', limit: '20' },
    }) as Request;
    const res = createMockResponse() as Response;

    await listHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      data: result.data,
      meta: result.meta,
    }));
  });

  it('getByIdHandler should return supplier', async () => {
    const supplier = { id: '1', name: 'S1' };
    vi.mocked(supplierService.getById).mockResolvedValue(supplier as never);

    const req = createMockRequest({
      commerceId: 'c1',
      params: { id: '1' },
    }) as Request;
    const res = createMockResponse() as Response;

    await getByIdHandler(req, res);

    expect(supplierService.getById).toHaveBeenCalledWith('1', 'c1');
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: supplier });
  });

  it('createHandler should return 201', async () => {
    const supplier = { id: '1', name: 'New' };
    vi.mocked(supplierService.create).mockResolvedValue(supplier as never);

    const req = createMockRequest({
      commerceId: 'c1',
      body: { name: 'New' },
    }) as Request;
    const res = createMockResponse() as Response;

    await createHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: supplier });
  });

  it('updateHandler should return updated supplier', async () => {
    const supplier = { id: '1', name: 'Updated' };
    vi.mocked(supplierService.update).mockResolvedValue(supplier as never);

    const req = createMockRequest({
      commerceId: 'c1',
      params: { id: '1' },
      body: { name: 'Updated' },
    }) as Request;
    const res = createMockResponse() as Response;

    await updateHandler(req, res);

    expect(supplierService.update).toHaveBeenCalledWith('1', 'c1', { name: 'Updated' });
  });

  it('deleteHandler should return deactivation message', async () => {
    vi.mocked(supplierService.softDelete).mockResolvedValue(undefined as never);

    const req = createMockRequest({
      commerceId: 'c1',
      params: { id: '1' },
    }) as Request;
    const res = createMockResponse() as Response;

    await deleteHandler(req, res);

    expect(supplierService.softDelete).toHaveBeenCalledWith('1', 'c1');
    expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Supplier deactivated' });
  });
});
