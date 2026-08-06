import { asBarId } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DuplicateSubscriptionDetectedEvent } from '../impl/duplicate-subscription-detected.event';
import { DuplicateSubscriptionDetectedHandler } from './duplicate-subscription-detected.handler';

describe('DuplicateSubscriptionDetectedHandler', () => {
  let handler: DuplicateSubscriptionDetectedHandler;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    error = vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
    handler = new DuplicateSubscriptionDetectedHandler();
  });

  it('should report the incident at error level with both subscriptions and the bar', () => {
    handler.handle(new DuplicateSubscriptionDetectedEvent(asBarId('bar-1'), 'sub_kept', 'sub_cancelled'));

    expect(error).toHaveBeenCalledTimes(1);
    const message = error.mock.calls[0][0] as string;
    expect(message).toContain('bar-1');
    expect(message).toContain('sub_kept');
    expect(message).toContain('sub_cancelled');
  });
});
