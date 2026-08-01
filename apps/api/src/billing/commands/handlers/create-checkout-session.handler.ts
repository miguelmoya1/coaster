import { BarId, CreateCheckoutSessionResponse } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StripeClient, getPriceId } from '../../../stripe';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';

@Injectable()
@CommandHandler(CreateCheckoutSessionCommand)
export class CreateCheckoutSessionHandler implements ICommandHandler<
  CreateCheckoutSessionCommand,
  CreateCheckoutSessionResponse
> {
  private readonly _logger = new Logger(CreateCheckoutSessionHandler.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
  ) {}

  async execute(command: CreateCheckoutSessionCommand): Promise<CreateCheckoutSessionResponse> {
    const { barId, plan, successUrl, cancelUrl } = command;
    this._logger.debug(`Executing CreateCheckoutSessionCommand for barId=${barId}, plan=${plan}`);

    const priceId = getPriceId(plan, this._configService);
    const customerId = await this.getOrCreateCustomerId(barId);

    const session = await this._stripeClient.client.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: barId,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        barId,
        plan,
      },
      subscription_data: {
        metadata: {
          barId,
          plan,
        },
      },
    });

    if (!session.url) {
      this._logger.error(`Stripe checkout session creation returned null URL for barId=${barId}`);
      throw new InternalServerErrorException('Unable to create Stripe checkout session');
    }

    this._logger.debug(`Checkout session created successfully: id=${session.id}`);

    return {
      id: session.id,
      url: session.url,
    };
  }

  private async getOrCreateCustomerId(barId: BarId): Promise<string> {
    const existing = await this._readRepo.findSubscriptionByBarId(barId);
    const bar = await this._readRepo.findBarById(barId);
    const customerName = bar?.name || `Bar ${barId}`;

    if (existing?.stripeCustomerId) {
      this._logger.debug(`Reusing existing Stripe customerId=${existing.stripeCustomerId} for barId=${barId}`);
      await this._stripeClient.client.customers.update(existing.stripeCustomerId, {
        name: customerName,
      });
      return existing.stripeCustomerId;
    }

    this._logger.debug(`Creating new Stripe customer for barId=${barId}`);
    const customer = await this._stripeClient.client.customers.create({
      metadata: { barId },
      name: customerName,
    });

    await this._writeRepo.upsertBarCustomerId(barId, customer.id);
    this._logger.debug(`Created and associated new Stripe customerId=${customer.id} for barId=${barId}`);

    return customer.id;
  }
}
