import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StripeCommandHandlers } from './commands';
import { StripeControllers } from './controllers';
import { StripeWebhookWriteRepository } from './data-access';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { StripeApi, StripeWebhookDispatcher } from './services';
import { StripeClient } from './utils/stripe-client.provider';

@Module({
  imports: [CqrsModule],
  controllers: [...StripeControllers],
  providers: [
    StripeClient,
    StripeApi,
    StripeWebhookGuard,
    StripeWebhookDispatcher,
    StripeWebhookWriteRepository,
    ...StripeCommandHandlers,
  ],
  exports: [StripeClient, StripeApi, StripeWebhookDispatcher, StripeWebhookGuard],
})
export class StripeModule {}
