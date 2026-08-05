import type { Event } from 'stripe';

export class CheckStripeWebhookCommand {
  constructor(public readonly event: Event) {}
}
