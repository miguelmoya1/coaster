import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StripeCommandHandlers } from './commands';
import { StripeControllers } from './controllers';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  imports: [CqrsModule],
  controllers: [...StripeControllers],
  providers: [StripeClient, StripeWebhookGuard, ...StripeCommandHandlers],
  exports: [StripeClient, StripeWebhookGuard],
})
export class StripeModule {}
