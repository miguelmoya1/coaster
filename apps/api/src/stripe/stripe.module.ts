import { Module } from '@nestjs/common';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeApi } from './services';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  providers: [StripeClient, StripeApi, StripeWebhookGuard],
  exports: [StripeClient, StripeApi, StripeWebhookGuard],
})
export class StripeModule {}
