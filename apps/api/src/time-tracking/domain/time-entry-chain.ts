import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);

export interface ChainPayload {
  id: string;
  barId: string;
  userId: string;
  rootId: string;
  type: string;
  action: string;
  occurredAt: Date;
  recordedAt: Date;
  workdayDate: Date;
  userSnapshot: { name: string; email: string };
  source: string;
  supersedesId: string | null;
  actorId: string;
  reason: string | null;
  sequence: bigint;
}

export interface ChainedEntry extends ChainPayload {
  prevHash: string;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  brokenAt: string | null;
  checked: number;
}

const canonical = (payload: ChainPayload): string =>
  [
    payload.id,
    payload.barId,
    payload.userId,
    payload.rootId,
    payload.type,
    payload.action,
    payload.occurredAt.toISOString(),
    payload.recordedAt.toISOString(),
    payload.workdayDate.toISOString().slice(0, 10),
    payload.userSnapshot?.name ?? '',
    payload.userSnapshot?.email ?? '',
    payload.source,
    payload.supersedesId ?? '',
    payload.actorId,
    payload.reason ?? '',
    payload.sequence.toString(),
  ].join('|');

export const hashEntry = (payload: ChainPayload, prevHash: string): string =>
  createHash('sha256')
    .update(`${prevHash}|${canonical(payload)}`)
    .digest('hex');

export const verifyChain = (entries: ChainedEntry[]): ChainVerification => {
  let previousHash = GENESIS_HASH;
  let previousSequence = 0n;

  for (const entry of entries) {
    const linked = entry.prevHash === previousHash && entry.sequence === previousSequence + 1n;

    if (!linked || hashEntry(entry, entry.prevHash) !== entry.hash) {
      return { valid: false, brokenAt: entry.id, checked: entries.length };
    }

    previousHash = entry.hash;
    previousSequence = entry.sequence;
  }

  return { valid: true, brokenAt: null, checked: entries.length };
};
