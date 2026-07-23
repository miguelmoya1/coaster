import { SubscriptionPlan } from '@coaster/common';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from './create-customer-portal-session.dto';

describe('Billing DTOs', () => {
  it('should validate CreateCustomerPortalSessionDto with localhost returnUrl', async () => {
    const dto = new CreateCustomerPortalSessionDto();
    dto.returnUrl = 'http://localhost:4200/bars/select';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate CreateCheckoutSessionDto with localhost URLs', async () => {
    const dto = new CreateCheckoutSessionDto();
    dto.plan = SubscriptionPlan.PRO_MONTHLY;
    dto.successUrl = 'http://localhost:4200/bars/select';
    dto.cancelUrl = 'http://localhost:4200/bars/select';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
