import { TestBed } from '@angular/core/testing';
import { asBarId, asProductId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { CreateOrder } from './create-order';

describe('CreateOrder', () => {
  let service: CreateOrder;
  let orderRepoMock: Record<string, Mock>;

  beforeEach(() => {
    orderRepoMock = {
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(CreateOrder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository', async () => {
      const barId = asBarId('bar-1');
      const dto = { items: [{ productId: asProductId('prod-1'), quantity: 1 }] };
      orderRepoMock['create'].mockResolvedValue(undefined);

      const result = await service.execute(barId, dto);

      expect(orderRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toBeUndefined();
    });
  });
});
