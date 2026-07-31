import { CreateCustomerPortalSessionResponse } from '@coaster/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../../data-access/billing.read.repository';
import { StripeClient } from '../../stripe-client.provider';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';

@Injectable()
@CommandHandler(CreateCustomerPortalSessionCommand)
export class CreateCustomerPortalSessionHandler implements ICommandHandler<
  CreateCustomerPortalSessionCommand,
  CreateCustomerPortalSessionResponse
> {
  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _readRepo: BillingReadRepository,
  ) {}

  async execute(command: CreateCustomerPortalSessionCommand): Promise<CreateCustomerPortalSessionResponse> {
    const { barId, returnUrl } = command;

    const subscription = await this._readRepo.findSubscriptionByBarId(barId);

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found for this bar');
    }

    const portalSession = await this._stripeClient.client.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }
}
