import { CreateCustomerPortalSessionResponse } from '@coaster/common';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StripeClient } from '../../../stripe';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';

@Injectable()
@CommandHandler(CreateCustomerPortalSessionCommand)
export class CreateCustomerPortalSessionHandler implements ICommandHandler<
  CreateCustomerPortalSessionCommand,
  CreateCustomerPortalSessionResponse
> {
  private readonly _logger = new Logger(CreateCustomerPortalSessionHandler.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _readRepo: BillingReadRepository,
  ) {}

  async execute(command: CreateCustomerPortalSessionCommand): Promise<CreateCustomerPortalSessionResponse> {
    const { barId, returnUrl } = command;
    this._logger.debug(`Executing CreateCustomerPortalSessionCommand for barId=${barId}`);

    const subscription = await this._readRepo.findSubscriptionByBarId(barId);

    if (!subscription?.stripeCustomerId) {
      this._logger.warn(`Cannot create customer portal session: No Stripe customer found for barId=${barId}`);
      throw new BadRequestException('No Stripe customer found for this bar');
    }

    const portalSession = await this._stripeClient.client.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    this._logger.debug(`Customer portal session created for barId=${barId}`);

    return { url: portalSession.url };
  }
}
