import { asEstablishmentId, asProductId } from '@coaster/common';
import { TestBed } from '@angular/core/testing';
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
      const establishmentId = asEstablishmentId('establishment-1');
      const dto = { items: [{ productId: asProductId('prod-1'), quantity: 1 }] };
      orderRepoMock['create'].mockResolvedValue(undefined);

      const result = await service.execute(establishmentId, dto);

      expect(orderRepoMock['create']).toHaveBeenCalledWith(establishmentId, dto);
      expect(result).toBeUndefined();
    });
  });
});
