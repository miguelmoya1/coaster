import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StripeModule } from '../stripe';
import { BillingCommandHandlers } from './commands';
import { BarBillingController } from './controllers/bar-billing.controller';
import { BillingWebhookController } from './controllers/billing-webhook.controller';
import { BillingReadRepository } from './data-access/billing.read.repository';
import { BillingWriteRepository } from './data-access/billing.write.repository';
import { BillingQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule, StripeModule],
  controllers: [BillingWebhookController, BarBillingController],
  providers: [BillingReadRepository, BillingWriteRepository, ...BillingCommandHandlers, ...BillingQueryHandlers],
  exports: [BillingReadRepository, BillingWriteRepository],
})
export class BillingModule {}
