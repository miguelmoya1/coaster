import { BarId, CreateCheckoutSessionResponse } from '@coaster/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
  ) {}

  async execute(command: CreateCheckoutSessionCommand): Promise<CreateCheckoutSessionResponse> {
    const { barId, plan, successUrl, cancelUrl } = command;
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
      throw new InternalServerErrorException('Unable to create Stripe checkout session');
    }

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
      await this._stripeClient.client.customers.update(existing.stripeCustomerId, {
        name: customerName,
      });
      return existing.stripeCustomerId;
    }

    const customer = await this._stripeClient.client.customers.create({
      metadata: { barId },
      name: customerName,
    });

    await this._writeRepo.upsertBarCustomerId(barId, customer.id);

    return customer.id;
  }
}
