import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from './create-customer-portal-session.dto';

describe('Billing DTOs', () => {
  it('should validate an empty CreateCustomerPortalSessionDto', async () => {
    const dto = new CreateCustomerPortalSessionDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate the PRO checkout plan', async () => {
    const dto = new CreateCheckoutSessionDto();
    dto.plan = SubscriptionPlan.PRO;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should default checkout to the only available PRO plan', async () => {
    const dto = new CreateCheckoutSessionDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.plan).toBe(SubscriptionPlan.PRO);
  });

  it('should expose an application error code for an unsupported plan', async () => {
    const dto = new CreateCheckoutSessionDto();
    dto.plan = 'YEARLY' as SubscriptionPlan;

    const errors = await validate(dto);

    expect(errors[0]?.constraints?.isIn).toBe(ErrorCodes.INVALID_SUBSCRIPTION_PLAN);
  });
});
