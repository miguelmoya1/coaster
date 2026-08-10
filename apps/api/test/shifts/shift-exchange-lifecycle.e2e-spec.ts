import { EstablishmentRole, ErrorCodes } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const HOUR = 60 * 60 * 1000;

describe('Shift exchange lifecycle (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let shiftId: string;
  let mate: { id: string; email: string; name: string };
  let mateHeaders: Record<string, string>;

  const server = () => testSetup.app.getHttpServer();

  const createShift = async (userId: string, startsIn: number) =>
    testSetup.prisma.dbShift.create({
      data: {
        userId,
        establishmentId,
        startTime: new Date(Date.now() + startsIn),
        endTime: new Date(Date.now() + startsIn + 4 * HOUR),
      },
    });

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
    });

    const establishment = await testSetup.createEstablishment('El Establishment');
    establishmentId = establishment.id;

    const created = await testSetup.prisma.dbUser.create({
      data: { email: 'mate@example.com', name: 'Compañera' },
    });
    mate = { id: created.id, email: created.email, name: created.name };
    mateHeaders = testSetup.actAs(mate);

    await testSetup.prisma.dbEstablishmentMember.create({
      data: { establishmentId, userId: mate.id, role: EstablishmentRole.STAFF },
    });

    const shift = await createShift(mockUser.id, 24 * HOUR);
    shiftId = shift.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const offer = () =>
    request(server()).post(`/api/establishments/${establishmentId}/shifts/${shiftId}/exchanges`).send({});

  const acceptAs = (exchangeId: string, headers: Record<string, string>) =>
    request(server()).patch(`/api/establishments/${establishmentId}/exchanges/${exchangeId}/accept`).set(headers);

  it('should hand the shift to whoever takes the offer', async () => {
    await offer().expect(201);

    const [exchange] = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });
    await acceptAs(exchange.id, mateHeaders).expect(200);

    const shift = await testSetup.prisma.dbShift.findUnique({ where: { id: shiftId } });
    const closed = await testSetup.prisma.dbShiftExchange.findUnique({ where: { id: exchange.id } });

    expect(shift?.userId).toBe(mate.id);
    expect(closed?.status).toBe('APPROVED');
    expect(closed?.targetId).toBe(mate.id);
  });

  it('should let the new owner offer that same shift again', async () => {
    await offer().expect(201);
    const [first] = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });
    await acceptAs(first.id, mateHeaders).expect(200);

    await request(server())
      .post(`/api/establishments/${establishmentId}/shifts/${shiftId}/exchanges`)
      .set(mateHeaders)
      .send({})
      .expect(201);

    const exchanges = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });

    expect(exchanges).toHaveLength(2);
    expect(exchanges.filter((exchange) => exchange.status === 'PENDING')).toHaveLength(1);
  });

  it('should keep at most one live offer per shift, even when the check is bypassed', async () => {
    await offer().expect(201);

    await expect(
      testSetup.prisma.dbShiftExchange.create({
        data: { shiftId, requesterId: mockUser.id, status: 'PENDING' },
      }),
    ).rejects.toThrow();
  });

  it('should turn the second acceptance down instead of handing the shift over twice', async () => {
    await offer().expect(201);
    const [exchange] = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });

    await acceptAs(exchange.id, mateHeaders).expect(200);

    const third = await testSetup.prisma.dbUser.create({ data: { email: 'third@example.com', name: 'Tercero' } });
    await testSetup.prisma.dbEstablishmentMember.create({
      data: { establishmentId, userId: third.id, role: EstablishmentRole.STAFF },
    });

    const response = await acceptAs(exchange.id, testSetup.actAs(third)).expect(400);

    expect(response.body.message).toContain(ErrorCodes.INVALID_EXCHANGE);

    const shift = await testSetup.prisma.dbShift.findUnique({ where: { id: shiftId } });
    expect(shift?.userId).toBe(mate.id);
  });

  it('should refuse to hand over a shift that already started', async () => {
    const running = await createShift(mockUser.id, -HOUR);
    const exchange = await testSetup.prisma.dbShiftExchange.create({
      data: { shiftId: running.id, requesterId: mockUser.id, status: 'PENDING' },
    });

    const response = await acceptAs(exchange.id, mateHeaders).expect(400);

    expect(response.body.message).toContain(ErrorCodes.EXCHANGE_SHIFT_ALREADY_STARTED);

    const untouched = await testSetup.prisma.dbShift.findUnique({ where: { id: running.id } });
    expect(untouched?.userId).toBe(mockUser.id);
  });

  it('should refuse to erase an exchange that already happened', async () => {
    await offer().expect(201);
    const [exchange] = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });
    await acceptAs(exchange.id, mateHeaders).expect(200);

    const response = await request(server())
      .delete(`/api/establishments/${establishmentId}/exchanges/${exchange.id}`)
      .expect(400);

    expect(response.body.message).toContain(ErrorCodes.EXCHANGE_ALREADY_CLOSED);
    expect(await testSetup.prisma.dbShiftExchange.findUnique({ where: { id: exchange.id } })).not.toBeNull();
  });

  it('should still let the requester withdraw a live offer', async () => {
    await offer().expect(201);
    const [exchange] = await testSetup.prisma.dbShiftExchange.findMany({ where: { shiftId } });

    await request(server()).delete(`/api/establishments/${establishmentId}/exchanges/${exchange.id}`).expect(200);

    expect(await testSetup.prisma.dbShiftExchange.findUnique({ where: { id: exchange.id } })).toBeNull();
  });

  it('should list an offer for a shift starting early today, not hide it in UTC', async () => {
    const localMidnight = Temporal.Now.zonedDateTimeISO('Europe/Madrid').startOfDay();
    const earlyToday = new Date(localMidnight.add({ minutes: 30 }).toInstant().epochMilliseconds);

    const shift = await testSetup.prisma.dbShift.create({
      data: {
        userId: mockUser.id,
        establishmentId,
        startTime: earlyToday,
        endTime: new Date(earlyToday.getTime() + HOUR),
      },
    });
    await testSetup.prisma.dbShiftExchange.create({
      data: { shiftId: shift.id, requesterId: mockUser.id, status: 'PENDING' },
    });

    const response = await request(server()).get(`/api/establishments/${establishmentId}/exchanges`).expect(200);

    expect(response.body.map((exchange: { shiftId: string }) => exchange.shiftId)).toContain(shift.id);
  });
});
