import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { DbService } from '../../core/db';

const WEBHOOK_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

export const StripeWebhookProcessingStatus = {
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class StripeWebhookWriteRepository {
  private readonly _logger = new Logger(StripeWebhookWriteRepository.name);

  constructor(private readonly _db: DbService) {}

  public async claim(event: Stripe.Event): Promise<boolean> {
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

    if (!existing || existing.processingStatus === StripeWebhookProcessingStatus.PROCESSED) {
      return false;
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

  public async markProcessed(stripeEventId: string): Promise<void> {
    this._logger.debug(`markProcessed: stripeEventId=${stripeEventId}`);
    await this._db.dbStripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processingStatus: StripeWebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  public async markFailed(stripeEventId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    this._logger.warn(`markFailed: stripeEventId=${stripeEventId}, error=${message}`);

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
