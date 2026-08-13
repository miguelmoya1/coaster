import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

/**
 * The bridge is a binary somebody double-clicks. It has no credentials until this exchange gives it
 * some, so the code carried in its filename is the only thing standing between a download and an
 * establishment's printer.
 */
describe('Printer pairing (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  let establishmentId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
    });

    const establishment = await testSetup.createEstablishment('Bar con impresora');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const issueCode = async (): Promise<string> => {
    const response = await request(http()).post(`/api/establishments/${establishmentId}/printer/pairing`).expect(201);

    return response.body.code;
  };

  it('should turn a code into the ids a bridge needs, without any credentials of its own', async () => {
    const code = await issueCode();

    const response = await request(http()).post('/api/printer/pair').send({ code }).expect(201);

    expect(response.body.establishmentId).toBe(establishmentId);
    expect(response.body.deviceKey).toBeTruthy();
  });

  it('should refuse the same code twice, because a filename is not a secret', async () => {
    const code = await issueCode();

    await request(http()).post('/api/printer/pair').send({ code }).expect(201);
    await request(http()).post('/api/printer/pair').send({ code }).expect(404);
  });

  it('should refuse a code that expired before anybody opened the file', async () => {
    const code = await issueCode();
    await testSetup.prisma.dbPrinterPairing.update({
      where: { code },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(http()).post('/api/printer/pair').send({ code }).expect(404);
  });

  it('should refuse a code nobody ever issued', async () => {
    await request(http()).post('/api/printer/pair').send({ code: 'ZZZZZZZZ' }).expect(404);
  });

  it('should give the same device key the establishment already prints with', async () => {
    const first = await request(http())
      .post('/api/printer/pair')
      .send({ code: await issueCode() })
      .expect(201);
    const second = await request(http())
      .post('/api/printer/pair')
      .send({ code: await issueCode() })
      .expect(201);

    expect(second.body.deviceKey).toBe(first.body.deviceKey);
  });
});
