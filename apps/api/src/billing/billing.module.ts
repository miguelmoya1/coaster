import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BarBillingController } from './controllers/bar-billing.controller';
import { BillingWebhookController } from './controllers/billing-webhook.controller';
import { BillingReadRepository } from './data-access/billing.read.repository';
import { BillingWriteRepository } from './data-access/billing.write.repository';
import { StripeClient, StripeCommandHandlers, StripeQueryHandlers, StripeWebhookGuard } from './stripe';

@Module({
  imports: [CqrsModule],
  controllers: [BillingWebhookController, BarBillingController],
  providers: [
    BillingReadRepository,
    BillingWriteRepository,
    StripeClient,
    StripeWebhookGuard,
    ...StripeCommandHandlers,
    ...StripeQueryHandlers,
  ],
  exports: [BillingReadRepository, BillingWriteRepository, StripeClient],
})
export class BillingModule {}
