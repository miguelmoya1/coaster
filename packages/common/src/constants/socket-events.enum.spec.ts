import { describe, expect, it } from 'vitest';
import { SocketEvents } from './socket-events.enum';

describe('SocketEvents', () => {
  it('should exist', () => {
    expect(SocketEvents).toBeTruthy();
  });
});
