import { DbAuthEventType } from '@coaster/core/db';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEventOccurred } from '../impl/auth-event.event';
import { RecordAuthEventHandler } from './record-auth-event.handler';

describe('RecordAuthEventHandler', () => {
  let events: any;
  let handler: RecordAuthEventHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    events = { record: vi.fn().mockResolvedValue({ id: 'event-1' }) };
    handler = new RecordAuthEventHandler(events);
  });

  const entry = { type: DbAuthEventType.LOGIN_SUCCEEDED, userId: 'user-1', email: 'a@coaster.test' };

  it('should write the event down as it was published', async () => {
    await handler.handle(new AuthEventOccurred(entry));

    expect(events.record).toHaveBeenCalledWith(entry);
  });

  it('should swallow a database that will not take it, so nobody loses their login over the log', async () => {
    events.record.mockRejectedValue(new Error('relation "AuthEvent" does not exist'));

    await expect(handler.handle(new AuthEventOccurred(entry))).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
