import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloseOtherSessionsCommand } from '../impl/close-other-sessions.command';
import { CloseOtherSessionsHandler } from './close-other-sessions.handler';

describe('CloseOtherSessionsHandler', () => {
  let sessions: any;
  let handler: CloseOtherSessionsHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    sessions = {
      findOwnedBy: vi.fn(),
      revokeEveryOtherFamilyOf: vi.fn(),
      revokeEverySessionOf: vi.fn(),
    };
    handler = new CloseOtherSessionsHandler(sessions);
  });

  it('should spare the family running the call, not just its newest row', async () => {
    sessions.findOwnedBy.mockResolvedValue({ id: 'mine', familyId: 'family-1' });

    await handler.execute(new CloseOtherSessionsCommand('user-1', 'mine'));

    expect(sessions.revokeEveryOtherFamilyOf).toHaveBeenCalledWith('user-1', 'family-1');
    expect(sessions.revokeEverySessionOf).not.toHaveBeenCalled();
  });

  it('should close everything when the calling token has no session behind it', async () => {
    sessions.findOwnedBy.mockResolvedValue(null);

    await handler.execute(new CloseOtherSessionsCommand('user-1', 'gone'));

    expect(sessions.revokeEverySessionOf).toHaveBeenCalledWith('user-1');
    expect(sessions.revokeEveryOtherFamilyOf).not.toHaveBeenCalled();
  });

  it('should close everything when there is no session id to spare', async () => {
    await handler.execute(new CloseOtherSessionsCommand('user-1', null));

    expect(sessions.findOwnedBy).not.toHaveBeenCalled();
    expect(sessions.revokeEverySessionOf).toHaveBeenCalledWith('user-1');
  });
});
