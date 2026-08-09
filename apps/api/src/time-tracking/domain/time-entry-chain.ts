import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);

/**
 * v1 left the workday and the identity snapshot outside the digest, so both could be edited in the
 * database without breaking the chain. v2 covers them. Entries keep the version they were signed
 * with: rewriting old hashes to the new shape would destroy the very thing the chain is evidence of.
 */
export const CURRENT_HASH_VERSION = 2;

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
  hashVersion: number;
}

export interface ChainVerification {
  valid: boolean;
  brokenAt: string | null;
  checked: number;
}

const workdayOf = (date: Date): string => date.toISOString().slice(0, 10);

const identityOf = (snapshot: ChainPayload['userSnapshot']): string =>
  `${snapshot?.name ?? ''}${snapshot?.email ?? ''}`;

const canonical = (payload: ChainPayload, version: number): string => {
  const base = [
    payload.id,
    payload.barId,
    payload.userId,
    payload.rootId,
    payload.type,
    payload.action,
    payload.occurredAt.toISOString(),
    payload.recordedAt.toISOString(),
    payload.source,
    payload.supersedesId ?? '',
    payload.actorId,
    payload.reason ?? '',
    payload.sequence.toString(),
  ];

  if (version === 1) {
    return base.join('|');
  }

  return [...base, workdayOf(payload.workdayDate), identityOf(payload.userSnapshot)].join('|');
};

export const hashEntry = (payload: ChainPayload, prevHash: string, version = CURRENT_HASH_VERSION): string =>
  createHash('sha256')
    .update(`${prevHash}|${canonical(payload, version)}`)
    .digest('hex');

export const verifyChain = (entries: ChainedEntry[]): ChainVerification => {
  let previousHash = GENESIS_HASH;
  let previousSequence = 0n;

  for (const entry of entries) {
    const linked = entry.prevHash === previousHash && entry.sequence === previousSequence + 1n;

    if (!linked || hashEntry(entry, entry.prevHash, entry.hashVersion) !== entry.hash) {
      return { valid: false, brokenAt: entry.id, checked: entries.length };
    }

    previousHash = entry.hash;
    previousSequence = entry.sequence;
  }

  return { valid: true, brokenAt: null, checked: entries.length };
};
