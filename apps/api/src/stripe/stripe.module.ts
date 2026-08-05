import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StripeCommandHandlers } from './commands';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  imports: [CqrsModule],
  providers: [StripeClient, StripeWebhookGuard, ...StripeCommandHandlers],
  exports: [StripeClient, StripeWebhookGuard],
})
export class StripeModule {}
