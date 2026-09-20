import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloseSessionCommand } from '../impl/close-session.command';
import { CloseSessionHandler } from './close-session.handler';

describe('CloseSessionHandler', () => {
  let sessions: any;
  let handler: CloseSessionHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    sessions = { findOwnedBy: vi.fn(), revokeFamily: vi.fn() };
    handler = new CloseSessionHandler(sessions);
  });

  const close = (currentSessionId: string | null = 'mine') =>
    handler.execute(new CloseSessionCommand('user-1', 'theirs', currentSessionId));

  it('should drop the whole family so the device cannot refresh its way back in', async () => {
    sessions.findOwnedBy
      .mockResolvedValueOnce({ id: 'theirs', familyId: 'family-2' })
      .mockResolvedValueOnce({ id: 'mine', familyId: 'family-1' });

    await expect(close()).resolves.toBeUndefined();

    expect(sessions.revokeFamily).toHaveBeenCalledWith('family-2');
  });

  it('should refuse to close the session making the call', async () => {
    sessions.findOwnedBy
      .mockResolvedValueOnce({ id: 'theirs', familyId: 'family-1' })
      .mockResolvedValueOnce({ id: 'mine', familyId: 'family-1' });

    await expect(close()).rejects.toThrow(BadRequestException);
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });

  it('should refuse a session that belongs to somebody else', async () => {
    sessions.findOwnedBy.mockResolvedValue(null);

    await expect(close()).rejects.toThrow(NotFoundException);
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });

  it('should still close one when the calling token has no session behind it', async () => {
    sessions.findOwnedBy.mockResolvedValueOnce({ id: 'theirs', familyId: 'family-2' });

    await expect(close(null)).resolves.toBeUndefined();

    expect(sessions.revokeFamily).toHaveBeenCalledWith('family-2');
  });
});
