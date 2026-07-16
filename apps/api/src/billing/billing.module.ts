import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BarBillingController } from './controllers/bar-billing.controller';
import { BillingWebhookController } from './controllers/billing-webhook.controller';
import { BillingService } from './services/billing.service';

@Module({
  imports: [CqrsModule],
  controllers: [BillingWebhookController, BarBillingController],
  providers: [BillingService],
})
export class BillingModule {}
