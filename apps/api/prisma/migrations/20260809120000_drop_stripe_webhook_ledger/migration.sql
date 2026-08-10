-- Every Stripe handler sets subscription state from the event payload rather than accumulating, so
-- replaying an event lands on the same row. The ledger was guarding against a duplicate delivery
-- that costs nothing, while Stripe already keeps the events and retries the failures itself.
DROP TABLE "StripeWebhookEvent";
