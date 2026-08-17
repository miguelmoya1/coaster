import { RealtimeEvents } from '@coaster/common';
import { RealtimeService } from '../../src/realtime';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const staff = {
  id: '00000000-0000-4000-8000-0000000000b1',
  email: 'staff@example.com',
  name: 'Staff',
};

const outsider = {
  id: '00000000-0000-4000-8000-0000000000b2',
  email: 'outsider@example.com',
  name: 'Outsider',
};

describe('Realtime stream (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let baseUrl: string;

  const open = (userId: string, id: string = establishmentId) =>
    fetch(`${baseUrl}/api/establishments/${id}/events`, {
      headers: { 'x-e2e-user-id': userId, accept: 'text/event-stream' },
    });

  const readFrames = async (response: Response, until: (seen: string) => boolean) => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let seen = '';

    try {
      while (!until(seen)) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        seen += decoder.decode(value, { stream: true });
      }
    } finally {
      await reader.cancel();
    }

    return seen;
  };

  beforeAll(async () => {
    await testSetup.setup();
    await testSetup.app.listen(0);

    const address = testSetup.app.getHttpServer().address();
    const port = address && typeof address !== 'string' ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [mockUser, staff, outsider].map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'USER',
        active: true,
      })),
    });

    const establishment = await testSetup.createEstablishment('The Bar');
    establishmentId = establishment.id;

    await testSetup.prisma.dbEstablishmentMember.create({
      data: { userId: staff.id, establishmentId, role: DbEstablishmentRole.STAFF },
    });

    testSetup.actAs(staff);
    testSetup.actAs(outsider);
  });

  it('should refuse the stream to somebody who does not belong to the establishment', async () => {
    const response = await open(outsider.id);

    expect(response.status).toBe(403);
    await response.body?.cancel();
  });

  it('should open an event stream for a member', async () => {
    const response = await open(staff.id);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    await response.body?.cancel();
  });

  it('should deliver an event published for that establishment', async () => {
    const response = await open(staff.id);
    const frames = readFrames(response, (seen) => seen.includes('orderCreated'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    testSetup.app
      .get(RealtimeService)
      .publish(establishmentId, RealtimeEvents.orderDeleted, { id: 'order-1' } as never);
    testSetup.app
      .get(RealtimeService)
      .publish(establishmentId, RealtimeEvents.orderCreated, { id: 'order-2' } as never);

    expect(await frames).toContain('event: orderCreated\ndata: {"id":"order-2"}');
  });

  it('should not leak an event meant for another establishment', async () => {
    const other = await testSetup.createEstablishment('Another Bar');
    const response = await open(staff.id);
    const frames = readFrames(response, (seen) => seen.includes('orderCreated'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    testSetup.app.get(RealtimeService).publish(other.id, RealtimeEvents.orderUpdated, { id: 'order-1' } as never);
    testSetup.app
      .get(RealtimeService)
      .publish(establishmentId, RealtimeEvents.orderCreated, { id: 'order-2' } as never);

    const seen = await frames;

    expect(seen).not.toContain('orderUpdated');
    expect(seen).toContain('orderCreated');
  });

  it('should close the stream of a user whose access is revoked', async () => {
    const response = await open(staff.id);

    await new Promise((resolve) => setTimeout(resolve, 50));

    testSetup.app.get(RealtimeService).revoke(establishmentId, staff.id);

    const reader = response.body!.getReader();
    let closed = false;

    while (!closed) {
      const { done } = await reader.read();
      closed = done;
    }

    expect(closed).toBe(true);
  });
});
