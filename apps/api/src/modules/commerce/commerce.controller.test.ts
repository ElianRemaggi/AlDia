import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createMockRequest, createMockResponse } from '../../test/mocks/mock-express';

vi.mock('./commerce.service');
import * as commerceService from './commerce.service';
import { listHandler, getByIdHandler, createHandler, updateHandler } from './commerce.controller';

describe('commerce.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listHandler should return commerces', async () => {
    const commerces = [{ id: '1', name: 'C1' }];
    vi.mocked(commerceService.list).mockResolvedValue(commerces as never);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    await listHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: commerces });
  });

  it('getByIdHandler should return single commerce', async () => {
    const commerce = { id: '1', name: 'C1' };
    vi.mocked(commerceService.getById).mockResolvedValue(commerce as never);

    const req = createMockRequest({ params: { id: '1' } }) as Request;
    const res = createMockResponse() as Response;

    await getByIdHandler(req, res);

    expect(commerceService.getById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: commerce });
  });

  it('createHandler should return 201', async () => {
    const commerce = { id: '1', name: 'New' };
    vi.mocked(commerceService.create).mockResolvedValue(commerce as never);

    const req = createMockRequest({ body: { name: 'New' } }) as Request;
    const res = createMockResponse() as Response;

    await createHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: commerce });
  });

  it('updateHandler should return updated commerce', async () => {
    const commerce = { id: '1', name: 'Updated' };
    vi.mocked(commerceService.update).mockResolvedValue(commerce as never);

    const req = createMockRequest({ params: { id: '1' }, body: { name: 'Updated' } }) as Request;
    const res = createMockResponse() as Response;

    await updateHandler(req, res);

    expect(commerceService.update).toHaveBeenCalledWith('1', { name: 'Updated' });
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: commerce });
  });
});
