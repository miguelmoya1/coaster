import type { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { DbService, DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';

const WEBHOOK_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

export const StripeWebhookProcessingStatus = {
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

export interface UpsertSubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: DbSubscriptionPlan;
  status: DbSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
}

@Injectable()
export class BillingWriteRepository {
  private readonly _logger = new Logger(BillingWriteRepository.name);

  constructor(private readonly _db: DbService) {}

  public async linkStripeReferences(barId: BarId, stripeCustomerId: string, stripeSubscriptionId?: string | null) {
    this._logger.debug(
      `linkStripeReferences: barId=${barId}, stripeCustomerId=${stripeCustomerId}, stripeSubscriptionId=${stripeSubscriptionId}`,
    );
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId,
        stripeSubscriptionId,
        plan: DbSubscriptionPlan.FREE,
        status: DbSubscriptionStatus.INACTIVE,
      },
      update: {
        stripeCustomerId,
        ...(stripeSubscriptionId !== undefined ? { stripeSubscriptionId } : {}),
      },
    });
  }

  public async upsertSubscriptionDetails(barId: BarId, data: UpsertSubscriptionData) {
    this._logger.debug(`upsertSubscriptionDetails: barId=${barId}, plan=${data.plan}, status=${data.status}`);
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        ...data,
      },
      update: data,
    });
  }

  public async updateManySubscriptionsStatusToPastDue(subscriptionId?: string | null, customerId?: string | null) {
    if (!subscriptionId && !customerId) {
      return { count: 0 };
    }

    this._logger.debug(
      `updateManySubscriptionsStatusToPastDue: subscriptionId=${subscriptionId}, customerId=${customerId}`,
    );
    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.updateMany({
      where,
      data: { status: DbSubscriptionStatus.PAST_DUE },
    });
  }

  public async markSubscriptionsPaid(subscriptionId?: string | null, customerId?: string | null) {
    if (!subscriptionId && !customerId) {
      return { count: 0 };
    }

    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.updateMany({
      where: {
        ...where,
        status: { in: [DbSubscriptionStatus.PAST_DUE, DbSubscriptionStatus.UNPAID] },
      },
      data: { status: DbSubscriptionStatus.ACTIVE },
    });
  }

  public async claimStripeWebhookEvent(event: Stripe.Event): Promise<boolean> {
    const now = new Date();
    let existing = await this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (!existing) {
      try {
        await this._db.dbStripeWebhookEvent.create({
          data: {
            stripeEventId: event.id,
            type: event.type,
            payload: JSON.parse(JSON.stringify(event)),
            processingStatus: StripeWebhookProcessingStatus.PROCESSING,
            attempts: 1,
            receivedAt: now,
          },
        });
        return true;
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        existing = await this._db.dbStripeWebhookEvent.findUnique({
          where: { stripeEventId: event.id },
        });
      }
    }

    if (!existing) {
      return false;
    }

    if (existing.processingStatus === StripeWebhookProcessingStatus.PROCESSED) {
      return this.reclaimProcessedEventIfProjectionIsMissing(event);
    }

    const staleBefore = new Date(now.getTime() - WEBHOOK_PROCESSING_TIMEOUT_MS);
    const reclaimed = await this._db.dbStripeWebhookEvent.updateMany({
      where: {
        stripeEventId: event.id,
        OR: [
          { processingStatus: StripeWebhookProcessingStatus.FAILED },
          {
            processingStatus: StripeWebhookProcessingStatus.PROCESSING,
            updatedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        processingStatus: StripeWebhookProcessingStatus.PROCESSING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    return reclaimed.count > 0;
  }

  private async reclaimProcessedEventIfProjectionIsMissing(event: Stripe.Event): Promise<boolean> {
    const barId = this.resolveProjectionBarId(event);

    if (!barId) {
      return false;
    }

    const subscription = await this._db.dbBarSubscription.findUnique({ where: { barId } });
    if (subscription) {
      return false;
    }

    const reclaimed = await this._db.dbStripeWebhookEvent.updateMany({
      where: {
        stripeEventId: event.id,
        processingStatus: StripeWebhookProcessingStatus.PROCESSED,
      },
      data: {
        processingStatus: StripeWebhookProcessingStatus.PROCESSING,
        attempts: { increment: 1 },
        processedAt: null,
        lastError: null,
      },
    });

    return reclaimed.count > 0;
  }

  private resolveProjectionBarId(event: Stripe.Event): BarId | null {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return (session.metadata?.barId || session.client_reference_id) as BarId | null;
    }

    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object as Stripe.Subscription;
      return (subscription.metadata?.barId || null) as BarId | null;
    }

    return null;
  }

  public async markStripeWebhookEventProcessed(stripeEventId: string): Promise<void> {
    await this._db.dbStripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processingStatus: StripeWebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  public async markStripeWebhookEventFailed(stripeEventId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';

    await this._db.dbStripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processingStatus: StripeWebhookProcessingStatus.FAILED,
        lastError: message.slice(0, 1000),
      },
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
