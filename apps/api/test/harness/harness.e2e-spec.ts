import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E2eTestSetup } from '../utils/e2e-setup';

/**
 * Checks the harness itself: it reaches whichever server `E2E_TARGET` picks. Nest's e2e app has no
 * versioning and Go answers under `/api/v1`, so the path in the message may carry the version.
 */
describe('E2e harness', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should answer Nest 404 for a route that does not exist', async () => {
    const response = await request(testSetup.app.getHttpServer()).get('/api/no-such-route').expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: expect.stringMatching(/^Cannot GET \/api\/(v1\/)?no-such-route$/),
    });
  });

  it('should forward a request with a body and still answer the 404', async () => {
    const response = await request(testSetup.app.getHttpServer())
      .post('/api/no-such-route')
      .send({ name: 'anything' })
      .expect(404);

    expect(response.body.message).toMatch(/^Cannot POST \/api\/(v1\/)?no-such-route$/);
  });

  it('should reach the same database the tests prepare', async () => {
    await testSetup.clearDatabase();

    expect(await testSetup.prisma.dbUser.count()).toBe(0);
  });
});
