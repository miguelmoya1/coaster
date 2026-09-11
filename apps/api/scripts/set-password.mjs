import { hash } from '@node-rs/argon2';
import { Client } from 'pg';

// Kept in step with apps/api/src/auth/domain/password.ts, whose spec pins these values.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const EXPECTED_PREFIX = '$argon2id$v=19$m=19456,t=2,p=1$';
const PASSWORD_MIN_LENGTH = 8;

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: DATABASE_URL=... node scripts/set-password.mjs <email> <password>');
  process.exit(1);
}

if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`The password needs at least ${PASSWORD_MIN_LENGTH} characters.`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const passwordHash = await hash(password, OPTIONS);

if (!passwordHash.startsWith(EXPECTED_PREFIX)) {
  console.error(`Refusing to store a hash the application does not expect: ${passwordHash.slice(0, 40)}`);
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

try {
  const { rows } = await client.query(
    'UPDATE "User" SET "passwordHash" = $1, "passwordUpdatedAt" = now() WHERE lower("email") = lower($2) RETURNING id, email',
    [passwordHash, email.trim()],
  );

  if (rows.length === 0) {
    console.error(`No account with the address ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(`Password set for ${rows[0].email} (${rows[0].id}).`);
  }
} finally {
  await client.end();
}
