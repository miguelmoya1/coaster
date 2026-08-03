import { SetMetadata } from '@nestjs/common';

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skip_subscription_check';
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);
