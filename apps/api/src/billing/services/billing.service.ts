import {
  BarId,
  BarSubscription,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@coaster/common';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { DbService, DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';
import { SubscriptionCancelledEvent, SubscriptionPaymentFailedEvent, SubscriptionRenewedEvent } from '../events';

@Injectable()
export class BillingService {
  private _stripe?: Stripe;
  private readonly _logger = new Logger(BillingService.name);

  constructor(
    private readonly _db: DbService,
    private readonly _configService: ConfigService,
    private readonly _eventBus: EventBus,
  ) {}

  async createCheckoutSession(
    barId: BarId,
    plan: Exclude<SubscriptionPlan, 'FREE'>,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CreateCheckoutSessionResponse> {
    const priceId = this.getPriceId(plan);
    const customerId = await this.getOrCreateCustomerId(barId);

    const session = await this.getStripeClient().checkout.sessions.create({
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

  async createCustomerPortalSession(barId: BarId, returnUrl: string): Promise<CreateCustomerPortalSessionResponse> {
    const subscription = await this._db.dbBarSubscription.findUnique({
      where: { barId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found for this bar');
    }

    const portalSession = await this.getStripeClient().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }

  async getBarSubscription(barId: BarId): Promise<BarSubscription> {
    const subscription = await this._db.dbBarSubscription.findUnique({ where: { barId } });

    if (!subscription) {
      return {
        barId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      barId,
      plan: subscription.plan,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString(),
      stripeCustomerId: subscription.stripeCustomerId ?? undefined,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? undefined,
    };
  }

  async handleStripeWebhook(rawBody: string, signature: string | undefined): Promise<void> {
    const webhookSecret = this._configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: Stripe.Event;

    try {
      event = this.getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this._logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    const alreadyProcessed = await this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (alreadyProcessed) {
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.handleSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.payment_failed': {
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        break;
    }

    await this._db.dbStripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode !== 'subscription') {
      return;
    }

    const barId = session.metadata?.barId || session.client_reference_id;
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    if (!barId || !customerId) {
      return;
    }

    await this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId: customerId,
        stripeSubscriptionId,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId,
      },
    });
  }

  private async handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer?.id ?? null);

    if (!customerId) {
      return;
    }

    const existing =
      (await this._db.dbBarSubscription.findFirst({ where: { stripeSubscriptionId: subscription.id } })) ||
      (await this._db.dbBarSubscription.findFirst({ where: { stripeCustomerId: customerId } }));

    const barId = existing?.barId || subscription.metadata?.barId;

    if (!barId) {
      return;
    }

    const firstItem = subscription.items.data[0];

    const currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : null;
    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : null;

    await this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: this.toDbPlan(firstItem?.price?.id),
        status: this.toDbStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: this.toDbPlan(firstItem?.price?.id),
        status: this.toDbStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    const eventPeriodEnd = currentPeriodEnd ?? undefined;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      this._eventBus.publish(new SubscriptionRenewedEvent(barId as BarId, subscription.id, eventPeriodEnd));
    }

    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      this._eventBus.publish(
        new SubscriptionCancelledEvent(barId as BarId, subscription.id, subscription.cancel_at_period_end, canceledAt),
      );
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
    const rawSub = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? null);

    if (!customerId && !subscriptionId) {
      return;
    }

    const where = subscriptionId
      ? { stripeSubscriptionId: subscriptionId }
      : { stripeCustomerId: customerId! };

    const affectedSubscriptions = await this._db.dbBarSubscription.findMany({
      where,
      select: { barId: true },
    });

    await this._db.dbBarSubscription.updateMany({
      where,
      data: { status: DbSubscriptionStatus.PAST_DUE },
    });

    for (const subscription of affectedSubscriptions) {
      this._eventBus.publish(new SubscriptionPaymentFailedEvent(subscription.barId as BarId, customerId ?? ''));
    }
  }

  private async getOrCreateCustomerId(barId: BarId): Promise<string> {
    const existing = await this._db.dbBarSubscription.findUnique({ where: { barId } });
    const bar = await this._db.dbBar.findUnique({ where: { id: barId } });
    const customerName = bar?.name || `Bar ${barId}`;

    if (existing?.stripeCustomerId) {
      await this.getStripeClient().customers.update(existing.stripeCustomerId, {
        name: customerName,
      });
      return existing.stripeCustomerId;
    }

    const customer = await this.getStripeClient().customers.create({
      metadata: { barId },
      name: customerName,
    });

    await this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId: customer.id,
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  private getPriceId(plan: Exclude<SubscriptionPlan, 'FREE'>): string {
    const monthly = this._configService.get<string>('STRIPE_PRICE_PRO_MONTHLY');
    const yearly = this._configService.get<string>('STRIPE_PRICE_PRO_YEARLY');

    const prices = {
      [SubscriptionPlan.PRO_MONTHLY]: monthly,
      [SubscriptionPlan.PRO_YEARLY]: yearly,
    };

    const priceId = prices[plan];

    if (!priceId) {
      throw new InternalServerErrorException(`Missing Stripe price for plan ${plan}`);
    }

    return priceId;
  }

  private toDbPlan(priceId: string | undefined): DbSubscriptionPlan {
    const monthly = this._configService.get<string>('STRIPE_PRICE_PRO_MONTHLY');
    const yearly = this._configService.get<string>('STRIPE_PRICE_PRO_YEARLY');

    if (priceId && monthly && priceId === monthly) {
      return DbSubscriptionPlan.PRO_MONTHLY;
    }

    if (priceId && yearly && priceId === yearly) {
      return DbSubscriptionPlan.PRO_YEARLY;
    }

    return DbSubscriptionPlan.FREE;
  }

  private toDbStatus(status: Stripe.Subscription.Status): DbSubscriptionStatus {
    switch (status) {
      case 'trialing':
        return DbSubscriptionStatus.TRIALING;
      case 'active':
        return DbSubscriptionStatus.ACTIVE;
      case 'past_due':
        return DbSubscriptionStatus.PAST_DUE;
      case 'canceled':
        return DbSubscriptionStatus.CANCELED;
      case 'unpaid':
        return DbSubscriptionStatus.UNPAID;
      default:
        return DbSubscriptionStatus.INACTIVE;
    }
  }

  private getStripeClient(): Stripe {
    if (this._stripe) {
      return this._stripe;
    }

    const apiKey = this._configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured');
    }

    this._stripe = new Stripe(apiKey);

    return this._stripe;
  }
}
