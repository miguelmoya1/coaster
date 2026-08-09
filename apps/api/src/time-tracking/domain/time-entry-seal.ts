import type { ChainedEntry } from './time-entry-chain';

export interface ChainSeal {
  sealedDate: Date;
  sequence: bigint;
  headHash: string;
}

export interface SealVerification {
  valid: boolean;
  brokenAt: string | null;
  checked: number;
}

export const verifySeals = (entries: ChainedEntry[], seals: ChainSeal[]): SealVerification => {
  const hashBySequence = new Map(entries.map((entry) => [entry.sequence, entry.hash]));

  for (const seal of seals) {
    const hash = hashBySequence.get(seal.sequence);

    if (hash !== seal.headHash) {
      return { valid: false, brokenAt: seal.sealedDate.toISOString().slice(0, 10), checked: seals.length };
    }
  }

  return { valid: true, brokenAt: null, checked: seals.length };
};
