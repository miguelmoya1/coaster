import { Module } from '@nestjs/common';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeClient } from './stripe-client.provider';

@Module({
  providers: [StripeClient, StripeWebhookGuard],
  exports: [StripeClient, StripeWebhookGuard],
})
export class StripeModule {}
