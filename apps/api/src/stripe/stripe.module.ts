import { Module } from '@nestjs/common';
import { StripeWebhookWriteRepository } from './data-access';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeApi } from './services';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  providers: [StripeClient, StripeApi, StripeWebhookGuard, StripeWebhookWriteRepository],
  exports: [StripeClient, StripeApi, StripeWebhookGuard, StripeWebhookWriteRepository],
})
export class StripeModule {}
