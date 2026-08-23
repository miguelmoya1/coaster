import { CacheService } from '@coaster/core';
import { asEstablishmentId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSettingsUpdatedEvent } from '../impl/establishment-settings-updated.event';
import { ForgetModulesCacheHandler } from './forget-modules-cache.handler';

describe('ForgetModulesCacheHandler', () => {
  const cache = { forget: vi.fn(), remember: vi.fn() };
  let handler: ForgetModulesCacheHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    handler = new ForgetModulesCacheHandler(cache as unknown as CacheService);
  });

  it('should drop the module list so toggling one takes effect on the next request', async () => {
    await handler.handle(new EstablishmentSettingsUpdatedEvent(asEstablishmentId('establishment-1')));

    expect(cache.forget).toHaveBeenCalledWith('establishment:establishment-1:modules');
  });
});
