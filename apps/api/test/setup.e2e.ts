import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as path from 'path';

let container: StartedPostgreSqlContainer;

export async function setup() {
  console.log('\n🚀 Starting PostgreSQL Testcontainer...');

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('coaster_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const databaseUrl = container.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;

  console.log(`✅ Testcontainer started: ${databaseUrl}`);
  console.log('⏳ Running Prisma db push...');

  try {
    execSync('npx prisma db push --accept-data-loss', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('✅ Prisma schema applied successfully.');
  } catch (err) {
    console.error('❌ Error applying Prisma schema:', err);
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
