import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import * as path from 'path';

let container: StartedPostgreSqlContainer;

const REQUIRED_SECRETS = ['PRINTER_JWT_SECRET'];

function generateMissingSecrets() {
  for (const name of REQUIRED_SECRETS) {
    if (!process.env[name]) {
      process.env[name] = randomBytes(32).toString('hex');
    }
  }
}

export async function setup() {
  generateMissingSecrets();

  /*
   * The suite gets a database of its own but would share whatever cache the developer has running,
   * and `clearDatabase` cannot reach into it: a role cached in one test then answers for a user the
   * next test has already deleted. Running without one keeps every test reading Postgres, which is
   * also what CI does, since there is no cache there to point at.
   *
   * Empty rather than deleted: `ConfigModule` only fills in variables that are absent, so deleting
   * it just hands the job back to `.env`.
   */
  process.env.REDIS_URL = '';

  console.log('\n🚀 Starting PostgreSQL Testcontainer...');

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('coaster_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const databaseUrl = container.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;

  console.log(`✅ Testcontainer started: ${databaseUrl}`);
  console.log('⏳ Applying Prisma migrations...');

  /*
   * Migrations, not `db push`: the schema alone leaves out everything written in raw SQL, such as
   * the append-only triggers on TimeEntry and the partial unique index on ShiftExchange. Those are
   * invariants the tests should be able to lean on, so e2e runs against what production runs.
   */
  try {
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('✅ Prisma migrations applied successfully.');
  } catch (err) {
    console.error('❌ Error applying Prisma migrations:', err);
    throw err;
  }
}

export async function teardown() {
  console.log('🛑 Stopping PostgreSQL Testcontainer...');
  if (container) {
    await container.stop();
    console.log('✅ Testcontainer stopped.');
  }
}
