import { EstablishmentPermission, SubscriptionPlan, SubscriptionStatus, asEstablishmentId } from '@coaster/common';
import { ESTABLISHMENT_PERMISSIONS_KEY } from '@coaster/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { CreateCheckoutSessionDto, CreateCustomerPortalSessionDto } from '../dto';
import { FindEstablishmentSubscriptionQuery } from '../queries';
import { EstablishmentSubscriptionController } from './establishment-subscription.controller';

describe('EstablishmentSubscriptionController', () => {
  let controller: EstablishmentSubscriptionController;
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };
  let queryBusMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn(),
    };
    queryBusMock = {
      execute: vi.fn(),
    };
    controller = new EstablishmentSubscriptionController(
      commandBusMock as unknown as CommandBus,
      queryBusMock as unknown as QueryBus,
    );
  });

  it('should execute FindEstablishmentSubscriptionQuery and return subscription', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const mockSubscription = {
      id: 'sub-1',
      establishmentId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: '2026-01-01T00:00:00.000Z',
      currentPeriodEnd: '2026-02-01T00:00:00.000Z',
      trialEndsAt: null,
      canceledAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queryBusMock.execute.mockResolvedValue(mockSubscription);

    const result = await controller.getEstablishmentSubscription(establishmentId);

    expect(queryBusMock.execute).toHaveBeenCalledWith(new FindEstablishmentSubscriptionQuery(establishmentId));
    expect(result).toEqual(mockSubscription);
  });

  it('should execute CreateCheckoutSessionCommand on createCheckoutSession', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const dto: CreateCheckoutSessionDto = { plan: SubscriptionPlan.PRO };
    const expectedResponse = { id: 'cs_123', url: 'https://checkout.stripe.com' };
    commandBusMock.execute.mockResolvedValue(expectedResponse);

    const result = await controller.createCheckoutSession(establishmentId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CreateCheckoutSessionCommand(establishmentId, dto.plan));
    expect(result).toEqual(expectedResponse);
  });

  describe('required permissions', () => {
    const permissionsOf = (handler: (...args: never[]) => unknown): EstablishmentPermission[] | undefined =>
      Reflect.getMetadata(ESTABLISHMENT_PERMISSIONS_KEY, handler);

    it('should let any member of the establishment read the subscription, since the whole UI depends on it', () => {
      expect(permissionsOf(EstablishmentSubscriptionController.prototype.getEstablishmentSubscription)).toBeUndefined();
    });

    it('should keep the billing actions behind ESTABLISHMENT_MANAGE_BILLING', () => {
      expect(permissionsOf(EstablishmentSubscriptionController.prototype.createCheckoutSession)).toEqual([
        EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      ]);
      expect(permissionsOf(EstablishmentSubscriptionController.prototype.createCustomerPortalSession)).toEqual([
        EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      ]);
    });
  });

  it('should execute CreateCustomerPortalSessionCommand on createCustomerPortalSession', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const dto: CreateCustomerPortalSessionDto = {};
    const expectedResponse = { url: 'https://portal.stripe.com' };
    commandBusMock.execute.mockResolvedValue(expectedResponse);

    const result = await controller.createCustomerPortalSession(establishmentId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CreateCustomerPortalSessionCommand(establishmentId));
    expect(result).toEqual(expectedResponse);
  });
});
