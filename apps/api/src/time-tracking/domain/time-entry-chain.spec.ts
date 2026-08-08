import { describe, expect, it } from 'vitest';
import { ChainedEntry, ChainPayload, GENESIS_HASH, hashEntry, verifyChain } from './time-entry-chain';

const payload = (overrides: Partial<ChainPayload> = {}): ChainPayload => ({
  id: 'entry-1',
  barId: 'bar-1',
  userId: 'user-1',
  rootId: 'entry-1',
  type: 'CLOCK_IN',
  action: 'RECORDED',
  occurredAt: new Date('2026-08-08T07:00:00.000Z'),
  recordedAt: new Date('2026-08-08T07:00:00.500Z'),
  source: 'EMPLOYEE_DEVICE',
  supersedesId: null,
  actorId: 'user-1',
  reason: null,
  sequence: 1n,
  ...overrides,
});

const link = (input: ChainPayload, prevHash: string): ChainedEntry => ({
  ...input,
  prevHash,
  hash: hashEntry(input, prevHash),
});

const chainOf = (...payloads: ChainPayload[]): ChainedEntry[] => {
  const entries: ChainedEntry[] = [];
  let prevHash = GENESIS_HASH;

  for (const item of payloads) {
    const entry = link(item, prevHash);
    entries.push(entry);
    prevHash = entry.hash;
  }

  return entries;
};

describe('time entry chain', () => {
  it('should hash the same payload the same way every time', () => {
    expect(hashEntry(payload(), GENESIS_HASH)).toBe(hashEntry(payload(), GENESIS_HASH));
  });

  it('should hash differently once a single minute moves', () => {
    const moved = payload({ occurredAt: new Date('2026-08-08T07:01:00.000Z') });

    expect(hashEntry(moved, GENESIS_HASH)).not.toBe(hashEntry(payload(), GENESIS_HASH));
  });

  it('should accept a chain built link by link', () => {
    const chain = chainOf(payload(), payload({ id: 'entry-2', rootId: 'entry-2', sequence: 2n }));

    expect(verifyChain(chain)).toEqual({ valid: true, brokenAt: null, checked: 2 });
  });

  it('should catch an hour edited straight in the database', () => {
    const chain = chainOf(payload(), payload({ id: 'entry-2', rootId: 'entry-2', sequence: 2n }));
    chain[0].occurredAt = new Date('2026-08-08T06:00:00.000Z');

    expect(verifyChain(chain)).toMatchObject({ valid: false, brokenAt: 'entry-1' });
  });

  it('should catch a row deleted from the middle of the chain', () => {
    const chain = chainOf(
      payload(),
      payload({ id: 'entry-2', rootId: 'entry-2', sequence: 2n }),
      payload({ id: 'entry-3', rootId: 'entry-3', sequence: 3n }),
    );

    expect(verifyChain([chain[0], chain[2]])).toMatchObject({ valid: false, brokenAt: 'entry-3' });
  });

  it('should count an empty chain as valid', () => {
    expect(verifyChain([])).toEqual({ valid: true, brokenAt: null, checked: 0 });
  });
});
