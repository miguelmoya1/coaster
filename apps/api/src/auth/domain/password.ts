import { hash, verify } from '@node-rs/argon2';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (plain: string): Promise<string> => hash(plain, OPTIONS);

export const verifyPassword = async (hashed: string, plain: string): Promise<boolean> => {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
};

const DUMMY_HASH = hash('coaster-has-no-user-here', OPTIONS);

export const burnVerificationTime = async (): Promise<false> => {
  await verifyPassword(await DUMMY_HASH, 'coaster-has-no-user-here-either');

  return false;
};
