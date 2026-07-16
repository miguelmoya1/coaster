import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { BillingService } from '../services/billing.service';

type StripeWebhookRequest = FastifyRequest & {
  rawBody?: string;
};

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly _billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() request: StripeWebhookRequest,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    await this._billingService.handleStripeWebhook(request.rawBody ?? '', signature);
    return { received: true };
  }
}
