import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StripeCommandHandlers } from './commands';
import { StripeControllers } from './controllers';
import { StripeWebhookWriteRepository } from './data-access';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeApi } from './services';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  imports: [CqrsModule],
  controllers: [...StripeControllers],
  providers: [StripeClient, StripeApi, StripeWebhookGuard, StripeWebhookWriteRepository, ...StripeCommandHandlers],
  exports: [StripeClient, StripeApi, StripeWebhookGuard],
})
export class StripeModule {}
