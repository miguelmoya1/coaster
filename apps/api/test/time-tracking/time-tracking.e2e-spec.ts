import { BarRole, ErrorCodes, TimeEntryAction, TimeEntrySource, TimeEntryType } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ChainSealService } from '../../src/time-tracking/services/chain-seal.service';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const HOUR = 60 * 60 * 1000;

describe('Time tracking (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let worker: { id: string; email: string; name: string };
  let workerHeaders: Record<string, string>;

  const server = () => testSetup.app.getHttpServer();

  const clockAs = (type: TimeEntryType, headers: Record<string, string> = {}) =>
    request(server()).post(`/api/bars/${barId}/time-entries/clock`).set(headers).send({ type });

  const entriesOf = (userId: string) =>
    testSetup.prisma.dbTimeEntry.findMany({ where: { userId }, orderBy: { sequence: 'asc' } });

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
    });

    const bar = await testSetup.createBar('El Bar');
    barId = bar.id;

    const created = await testSetup.prisma.dbUser.create({ data: { email: 'luis@example.com', name: 'Luis' } });
    worker = { id: created.id, email: created.email, name: created.name };
    workerHeaders = testSetup.actAs(worker);

    await testSetup.prisma.dbBarMember.create({ data: { barId, userId: worker.id, role: BarRole.STAFF } });
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('clocking', () => {
    it('should walk a whole workday and add up the hours', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(201);
      await clockAs(TimeEntryType.BREAK_END, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries/me`).set(workerHeaders).expect(200);
      const [workday] = response.body;

      expect(workday.state).toBe('OUT');
      expect(workday.entries).toHaveLength(4);
      expect(workday.entries.every((entry: { source: string }) => entry.source === TimeEntrySource.EMPLOYEE_DEVICE));
    });

    it('should answer for a day nobody worked instead of blowing up', async () => {
      const response = await request(server())
        .get(`/api/bars/${barId}/time-entries/me?from=2026-08-10&to=2026-08-10`)
        .set(workerHeaders)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should read back a day other than today', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);
      const day = punch.workdayDate.toISOString().slice(0, 10);

      const response = await request(server())
        .get(`/api/bars/${barId}/time-entries?from=${day}&to=${day}`)
        .expect(200);

      expect(response.body[0].date).toBe(day);
      expect(response.body[0].entries).toHaveLength(1);
    });

    it('should refuse a punch that does not fit the day', async () => {
      const response = await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(400);

      expect(response.body.message).toContain(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    });

    it('should stamp the server clock and chain every punch', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      const entries = await entriesOf(worker.id);

      expect(entries).toHaveLength(2);
      expect(entries[0].prevHash).toBe('0'.repeat(64));
      expect(entries[1].prevHash).toBe(entries[0].hash);
      expect(entries[1].sequence - entries[0].sequence).toBe(1n);
    });
  });

  describe('corrections', () => {
    const amend = (entryId: string, headers: Record<string, string>, occurredAt: string) =>
      request(server())
        .post(`/api/bars/${barId}/time-entries/${entryId}/amend`)
        .set(headers)
        .send({ occurredAt, reason: 'Entre antes pero fiche tarde' });

    it('should keep the original punch and add the correction on top', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [original] = await entriesOf(worker.id);
      const earlier = new Date(original.occurredAt.getTime() - HOUR).toISOString();

      await amend(original.id, workerHeaders, earlier).expect(201);

      const entries = await entriesOf(worker.id);
      const untouched = entries.find((entry) => entry.id === original.id);
      const correction = entries.find((entry) => entry.action === TimeEntryAction.AMENDED);

      expect(entries).toHaveLength(2);
      expect(untouched?.occurredAt).toEqual(original.occurredAt);
      expect(correction?.supersedesId).toBe(original.id);
      expect(correction?.rootId).toBe(original.rootId);
      expect(correction?.reason).toBe('Entre antes pero fiche tarde');
      expect(correction?.actorId).toBe(worker.id);
    });

    it('should show the worker the history of what was changed on their day', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [original] = await entriesOf(worker.id);
      await amend(original.id, workerHeaders, new Date(original.occurredAt.getTime() - HOUR).toISOString()).expect(201);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries/me`).set(workerHeaders).expect(200);
      const [entry] = response.body[0].entries;

      expect(entry.amended).toBe(true);
      expect(entry.revisions).toHaveLength(2);
      expect(entry.revisions[1].reason).toBe('Entre antes pero fiche tarde');
    });

    it('should stop a worker from touching somebody elses hours', async () => {
      await clockAs(TimeEntryType.CLOCK_IN).expect(201);
      const [ownersPunch] = await entriesOf(mockUser.id);

      const response = await amend(
        ownersPunch.id,
        workerHeaders,
        new Date(ownersPunch.occurredAt.getTime() - HOUR).toISOString(),
      ).expect(403);

      expect(response.body.message).toContain(ErrorCodes.NOT_YOUR_TIME_ENTRY);
      expect(await entriesOf(mockUser.id)).toHaveLength(1);
    });

    it('should let whoever runs the bar fix anybody hours', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await amend(punch.id, {}, new Date(punch.occurredAt.getTime() - HOUR).toISOString()).expect(201);

      const entries = await entriesOf(worker.id);
      expect(entries).toHaveLength(2);
      expect(entries[1].actorId).toBe(mockUser.id);
    });

    it('should refuse a correction without a reason worth the name', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await request(server())
        .post(`/api/bars/${barId}/time-entries/${punch.id}/amend`)
        .set(workerHeaders)
        .send({ occurredAt: punch.occurredAt.toISOString(), reason: 'ok' })
        .expect(400);
    });

    it('should keep a voided punch on the record instead of deleting it', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await request(server())
        .post(`/api/bars/${barId}/time-entries/${punch.id}/void`)
        .send({ reason: 'Marca duplicada del terminal' })
        .expect(201);

      const entries = await entriesOf(worker.id);
      expect(entries).toHaveLength(2);
      expect(entries[1].action).toBe(TimeEntryAction.VOIDED);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries/me`).set(workerHeaders).expect(200);
      expect(response.body[0].entries[0].voided).toBe(true);
    });
  });

  describe('the record itself', () => {
    it('should refuse an UPDATE even straight against the database', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await expect(
        testSetup.prisma.$executeRawUnsafe(`UPDATE "TimeEntry" SET "occurredAt" = now() WHERE id = '${punch.id}'`),
      ).rejects.toThrow(/append-only/);
    });

    it('should refuse a DELETE even straight against the database', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await expect(
        testSetup.prisma.$executeRawUnsafe(`DELETE FROM "TimeEntry" WHERE id = '${punch.id}'`),
      ).rejects.toThrow(/append-only/);
    });

    it('should report the chain as intact', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries/integrity`).expect(200);

      expect(response.body).toMatchObject({ valid: true, brokenAt: null, checkedEntries: 2 });
    });

    describe('when somebody with enough privileges turns the append-only triggers off', () => {
      const withTriggersOff = async (statement: string) => {
        await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" DISABLE TRIGGER USER`);
        await testSetup.prisma.$executeRawUnsafe(statement);
        await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" ENABLE TRIGGER USER`);
      };

      const integrity = async () =>
        (await request(server()).get(`/api/bars/${barId}/time-entries/integrity`).expect(200)).body;

      it('should catch a mark moved to another workday', async () => {
        await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
        const [punch] = await entriesOf(worker.id);

        await withTriggersOff(
          `UPDATE "TimeEntry" SET "workdayDate" = "workdayDate" - INTERVAL '1 day' WHERE id = '${punch.id}'`,
        );

        expect(await integrity()).toMatchObject({ valid: false, brokenAt: punch.id });
      });

      it('should catch a mark reassigned to somebody else', async () => {
        await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
        const [punch] = await entriesOf(worker.id);

        await withTriggersOff(
          `UPDATE "TimeEntry" SET "userSnapshot" = '{"name":"Otro","email":"otro@bar.com"}'::jsonb WHERE id = '${punch.id}'`,
        );

        expect(await integrity()).toMatchObject({ valid: false, brokenAt: punch.id });
      });

      it('should catch an hour edited on the mark', async () => {
        await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
        const [punch] = await entriesOf(worker.id);

        await withTriggersOff(
          `UPDATE "TimeEntry" SET "occurredAt" = "occurredAt" - INTERVAL '1 hour' WHERE id = '${punch.id}'`,
        );

        expect(await integrity()).toMatchObject({ valid: false, brokenAt: punch.id });
      });
    });

    it('should hand the inspector a CSV with one row per revision', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);
      await request(server())
        .post(`/api/bars/${barId}/time-entries/${punch.id}/amend`)
        .send({ occurredAt: new Date(punch.occurredAt.getTime() - HOUR).toISOString(), reason: 'Olvido fichar' })
        .expect(201);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries/export`).expect(200);
      const rows = response.text.trim().split('\n');

      expect(response.headers['content-type']).toContain('text/csv');
      expect(rows[0]).toContain('dia;empleado;marca;hora');
      expect(rows).toHaveLength(3);
      expect(rows[2]).toContain('Olvido fichar');
    });
  });

  describe('the daily seal', () => {
    const sealer = () => testSetup.app.get(ChainSealService);

    const integrity = async () =>
      (await request(server()).get(`/api/bars/${barId}/time-entries/integrity`).expect(200)).body;

    it('should record where the chain ended', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      expect(await sealer().sealAll()).toBe(1);

      const [seal] = await testSetup.prisma.dbTimeEntrySeal.findMany({ where: { barId } });
      expect(seal.sequence).toBe(2n);
      expect(await integrity()).toMatchObject({ valid: true, sealsValid: true, checkedSeals: 1 });
    });

    it('should seal a bar only once a day', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      expect(await sealer().sealAll()).toBe(1);
      expect(await sealer().sealAll()).toBe(0);

      expect(await testSetup.prisma.dbTimeEntrySeal.count({ where: { barId } })).toBe(1);
    });

    it('should catch a chain rebuilt from scratch, which the chain alone cannot', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await sealer().sealAll();

      const [punch] = await entriesOf(worker.id);
      const rebuilt = await testSetup.prisma.$queryRawUnsafe<{ hash: string }[]>(
        `SELECT hash FROM "TimeEntry" WHERE id = '${punch.id}'`,
      );

      await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" DISABLE TRIGGER USER`);
      await testSetup.prisma.$executeRawUnsafe(
        `UPDATE "TimeEntry" SET "occurredAt" = "occurredAt" - INTERVAL '1 hour', hash = '${'f'.repeat(64)}' WHERE id = '${punch.id}'`,
      );
      await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" ENABLE TRIGGER USER`);

      const result = await integrity();

      expect(rebuilt[0].hash).not.toBe('f'.repeat(64));
      expect(result.sealsValid).toBe(false);
      expect(result.valid).toBe(false);
    });

    it('should refuse an UPDATE on a seal even straight against the database', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await sealer().sealAll();

      await expect(
        testSetup.prisma.$executeRawUnsafe(`UPDATE "TimeEntrySeal" SET "headHash" = 'x' WHERE "barId" = '${barId}'`),
      ).rejects.toThrow(/append-only/);
    });
  });

  describe('the rota against what was really worked', () => {
    const today = () => new Date().toISOString().slice(0, 10);

    const scheduleToday = (startHour: number, endHour: number) => {
      const start = new Date(`${today()}T00:00:00.000Z`);
      start.setUTCHours(startHour);
      const end = new Date(`${today()}T00:00:00.000Z`);
      end.setUTCHours(endHour);

      return testSetup.prisma.dbShift.create({
        data: { barId, userId: worker.id, startTime: start, endTime: end },
      });
    };

    const workdaysToday = async () =>
      (
        await request(server())
          .get(`/api/bars/${barId}/time-entries`)
          .query({ from: today(), to: today() })
          .expect(200)
      ).body as { userId: string; discrepancies: string[]; plannedMinutes: number | null }[];

    it('should show a scheduled day nobody clocked into', async () => {
      await scheduleToday(8, 16);

      const [day] = await workdaysToday();

      expect(day.userId).toBe(worker.id);
      expect(day.discrepancies).toEqual(['NO_SHOW']);
      expect(day.plannedMinutes).toBe(480);
    });

    it('should flag a day worked with nothing on the rota', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const [day] = await workdaysToday();

      expect(day.discrepancies).toEqual(['UNPLANNED']);
      expect(day.plannedMinutes).toBeNull();
    });

    it('should carry the planned window alongside the marks', async () => {
      await scheduleToday(8, 16);
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const [day] = await workdaysToday();

      expect(day.plannedMinutes).toBe(480);
      expect(day).toHaveProperty('plannedStart');
      expect(day).toHaveProperty('plannedEnd');
    });
  });

  describe('who may look', () => {
    it('should not let a worker read the whole team timesheet', async () => {
      await request(server()).get(`/api/bars/${barId}/time-entries`).set(workerHeaders).expect(403);
    });

    it('should let whoever runs the bar read it', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const response = await request(server()).get(`/api/bars/${barId}/time-entries`).expect(200);

      expect(response.body[0].userId).toBe(worker.id);
    });
  });
});
