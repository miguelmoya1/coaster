import { RealtimeEvents } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeRegistry, RealtimeSubscriber } from './realtime.registry';

const frame = { id: '1000', event: RealtimeEvents.orderCreated, payload: { id: 'order-1' } };

const buildSubscriber = (userId: string): RealtimeSubscriber => ({
  userId,
  deliver: vi.fn(),
  close: vi.fn(),
});

describe('RealtimeRegistry', () => {
  let registry: RealtimeRegistry;

  beforeEach(() => {
    registry = new RealtimeRegistry();
  });

  it('should deliver to every subscriber of the establishment', () => {
    const first = buildSubscriber('user-1');
    const second = buildSubscriber('user-2');

    registry.add('establishment-1', first);
    registry.add('establishment-1', second);
    registry.deliver('establishment-1', frame);

    expect(first.deliver).toHaveBeenCalledWith(frame);
    expect(second.deliver).toHaveBeenCalledWith(frame);
  });

  it('should leave the subscribers of another establishment alone', () => {
    const outsider = buildSubscriber('user-1');

    registry.add('establishment-2', outsider);
    registry.deliver('establishment-1', frame);

    expect(outsider.deliver).not.toHaveBeenCalled();
  });

  it('should stop delivering once the subscriber is removed', () => {
    const subscriber = buildSubscriber('user-1');
    const remove = registry.add('establishment-1', subscriber);

    remove();
    registry.deliver('establishment-1', frame);

    expect(subscriber.deliver).not.toHaveBeenCalled();
    expect(registry.countFor('establishment-1')).toBe(0);
  });

  it('should close only the streams of the revoked user', () => {
    const revoked = buildSubscriber('user-1');
    const workmate = buildSubscriber('user-2');

    registry.add('establishment-1', revoked);
    registry.add('establishment-1', workmate);
    registry.revoke('establishment-1', 'user-1');

    expect(revoked.close).toHaveBeenCalled();
    expect(workmate.close).not.toHaveBeenCalled();
  });

  it('should close every stream the revoked user has open', () => {
    const tablet = buildSubscriber('user-1');
    const till = buildSubscriber('user-1');

    registry.add('establishment-1', tablet);
    registry.add('establishment-1', till);
    registry.revoke('establishment-1', 'user-1');

    expect(tablet.close).toHaveBeenCalled();
    expect(till.close).toHaveBeenCalled();
  });

  it('should survive a subscriber that removes itself while being delivered to', () => {
    const subscriber = buildSubscriber('user-1');
    const remove = registry.add('establishment-1', subscriber);

    vi.mocked(subscriber.deliver).mockImplementation(() => remove());

    expect(() => registry.deliver('establishment-1', frame)).not.toThrow();
    expect(registry.countFor('establishment-1')).toBe(0);
  });
});
