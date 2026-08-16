import {
  EstablishmentRole,
  ErrorCodes,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  WorkdayDiscrepancy,
} from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { formatWorkdayDate, shiftWorkdayDate, toWorkdayDate } from '../../src/time-tracking/domain/workday';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const HOUR = 60 * 60 * 1000;

describe('Time tracking (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let worker: { id: string; email: string; name: string };
  let workerHeaders: Record<string, string>;

  const server = () => testSetup.app.getHttpServer();

  const clockAs = (type: TimeEntryType, headers: Record<string, string> = {}) =>
    request(server()).post(`/api/establishments/${establishmentId}/time-entries/clock`).set(headers).send({ type });

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

    const establishment = await testSetup.createEstablishment('El Establishment');
    establishmentId = establishment.id;

    const created = await testSetup.prisma.dbUser.create({ data: { email: 'luis@example.com', name: 'Luis' } });
    worker = { id: created.id, email: created.email, name: created.name };
    workerHeaders = testSetup.actAs(worker);

    await testSetup.prisma.dbEstablishmentMember.create({
      data: { establishmentId, userId: worker.id, role: EstablishmentRole.STAFF },
    });
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

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me`)
        .set(workerHeaders)
        .expect(200);
      const [workday] = response.body;

      expect(workday.state).toBe('OUT');
      expect(workday.entries).toHaveLength(4);
      expect(workday.entries.every((entry: { source: string }) => entry.source === TimeEntrySource.EMPLOYEE_DEVICE));
    });

    it('should answer for a day nobody worked instead of blowing up', async () => {
      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me?from=2026-08-10&to=2026-08-10`)
        .set(workerHeaders)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should read back a day other than today', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);
      const day = punch.workdayDate.toISOString().slice(0, 10);

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries?from=${day}&to=${day}`)
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

  describe('a whole shift, punch by punch', () => {
    const myWorkday = async () => {
      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me`)
        .set(workerHeaders)
        .expect(200);

      return response.body[0];
    };

    it('should move the worker through in, break, back and out, reporting each step as it happens', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      expect((await myWorkday()).state).toBe('IN');

      await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(201);
      expect((await myWorkday()).state).toBe('ON_BREAK');

      await clockAs(TimeEntryType.BREAK_END, workerHeaders).expect(201);
      expect((await myWorkday()).state).toBe('IN');

      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      const closed = await myWorkday();
      expect(closed.state).toBe('OUT');
      expect(closed.entries).toHaveLength(4);
      expect(closed.entries.map((entry: { type: string }) => entry.type)).toEqual([
        TimeEntryType.CLOCK_IN,
        TimeEntryType.BREAK_START,
        TimeEntryType.BREAK_END,
        TimeEntryType.CLOCK_OUT,
      ]);
    });

    it('should refuse the punches that make no sense at each step, leaving the day as it was', async () => {
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(400);
      await clockAs(TimeEntryType.BREAK_END, workerHeaders).expect(400);

      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(400);
      await clockAs(TimeEntryType.BREAK_END, workerHeaders).expect(400);

      await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(201);
      await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(400);

      const day = await myWorkday();
      expect(day.state).toBe('ON_BREAK');
      expect(day.entries).toHaveLength(2);
    });

    it('should let the worker close the day straight from a break', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      await clockAs(TimeEntryType.BREAK_START, workerHeaders).expect(201);
      await clockAs(TimeEntryType.CLOCK_OUT, workerHeaders).expect(201);

      expect((await myWorkday()).state).toBe('OUT');
    });
  });

  describe('shifts that run into the next day', () => {
    const workdayOf = (daysFromToday: number) =>
      formatWorkdayDate(shiftWorkdayDate(toWorkdayDate(new Date()), daysFromToday));

    /** Noon UTC on that workday is comfortably inside it in Madrid, whatever the season. */
    const middayOf = (daysFromToday: number) =>
      new Date(new Date(`${workdayOf(daysFromToday)}T00:00:00.000Z`).getTime() + 12 * HOUR).toISOString();

    const addMark = (type: TimeEntryType, occurredAt: string) =>
      request(server())
        .post(`/api/establishments/${establishmentId}/time-entries`)
        .send({ userId: worker.id, type, occurredAt, reason: 'Alta manual del responsable' });

    const workdaysBetween = async (from: string, to: string) => {
      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me`)
        .query({ from, to })
        .set(workerHeaders)
        .expect(200);

      return response.body;
    };

    /* 03:00 UTC is 05:00 in Madrid: the small hours, whatever time of day the suite happens to run. */
    const smallHoursAfter = (daysFromToday: number) =>
      new Date(new Date(`${workdayOf(daysFromToday + 1)}T00:00:00.000Z`).getTime() + 3 * HOUR).toISOString();

    it('should file a punch made after midnight on the day the shift started', async () => {
      await addMark(TimeEntryType.CLOCK_IN, middayOf(-1)).expect(201);

      await addMark(TimeEntryType.CLOCK_OUT, smallHoursAfter(-1)).expect(201);

      const [yesterday] = await workdaysBetween(workdayOf(-1), workdayOf(-1));
      expect(yesterday.date).toBe(workdayOf(-1));
      expect(yesterday.state).toBe('OUT');
      expect(yesterday.entries).toHaveLength(2);

      expect(await workdaysBetween(workdayOf(0), workdayOf(0))).toEqual([]);
    });

    it('should let the worker start today even though yesterday was never closed', async () => {
      await addMark(TimeEntryType.CLOCK_IN, middayOf(-1)).expect(201);

      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const [today] = await workdaysBetween(workdayOf(0), workdayOf(0));
      expect(today.date).toBe(workdayOf(0));
      expect(today.state).toBe('IN');
    });

    it('should still hand back the unclosed day, flagged for somebody to correct', async () => {
      await addMark(TimeEntryType.CLOCK_IN, middayOf(-1)).expect(201);

      const [yesterday] = await workdaysBetween(workdayOf(-1), workdayOf(-1));

      expect(yesterday.state).toBe('IN');
      expect(yesterday.discrepancies).toContain(WorkdayDiscrepancy.NOT_CLOSED);
    });

    it('should stop an abandoned day from piling up hours forever', async () => {
      await addMark(TimeEntryType.CLOCK_IN, middayOf(-3)).expect(201);

      const [abandoned] = await workdaysBetween(workdayOf(-3), workdayOf(-3));

      /* Noon UTC to the cut-off at 04:00 UTC next morning: sixteen hours, however long ago it was. */
      expect(abandoned.workedMinutes).toBe(16 * 60);
      expect(abandoned.discrepancies).toContain(WorkdayDiscrepancy.NOT_CLOSED);
    });

    it('should leave a day closed two days ago out of the way of today', async () => {
      await addMark(TimeEntryType.CLOCK_IN, middayOf(-2)).expect(201);
      await addMark(TimeEntryType.CLOCK_OUT, middayOf(-2)).expect(201);

      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const [today] = await workdaysBetween(workdayOf(0), workdayOf(0));
      expect(today.state).toBe('IN');
    });
  });

  describe('corrections', () => {
    const amend = (entryId: string, headers: Record<string, string>, occurredAt: string) =>
      request(server())
        .post(`/api/establishments/${establishmentId}/time-entries/${entryId}/amend`)
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

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me`)
        .set(workerHeaders)
        .expect(200);
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

    it('should let whoever runs the establishment fix anybody hours', async () => {
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
        .post(`/api/establishments/${establishmentId}/time-entries/${punch.id}/amend`)
        .set(workerHeaders)
        .send({ occurredAt: punch.occurredAt.toISOString(), reason: 'ok' })
        .expect(400);
    });

    it('should keep a voided punch on the record instead of deleting it', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);
      const [punch] = await entriesOf(worker.id);

      await request(server())
        .post(`/api/establishments/${establishmentId}/time-entries/${punch.id}/void`)
        .send({ reason: 'Marca duplicada del terminal' })
        .expect(201);

      const entries = await entriesOf(worker.id);
      expect(entries).toHaveLength(2);
      expect(entries[1].action).toBe(TimeEntryAction.VOIDED);

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/me`)
        .set(workerHeaders)
        .expect(200);
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

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/integrity`)
        .expect(200);

      expect(response.body).toMatchObject({ valid: true, brokenAt: null, checkedEntries: 2 });
    });

    describe('when somebody with enough privileges turns the append-only triggers off', () => {
      const withTriggersOff = async (statement: string) => {
        await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" DISABLE TRIGGER USER`);
        await testSetup.prisma.$executeRawUnsafe(statement);
        await testSetup.prisma.$executeRawUnsafe(`ALTER TABLE "TimeEntry" ENABLE TRIGGER USER`);
      };

      const integrity = async () =>
        (await request(server()).get(`/api/establishments/${establishmentId}/time-entries/integrity`).expect(200)).body;

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
          `UPDATE "TimeEntry" SET "userSnapshot" = '{"name":"Otro","email":"otro@establishment.com"}'::jsonb WHERE id = '${punch.id}'`,
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
        .post(`/api/establishments/${establishmentId}/time-entries/${punch.id}/amend`)
        .send({ occurredAt: new Date(punch.occurredAt.getTime() - HOUR).toISOString(), reason: 'Olvido fichar' })
        .expect(201);

      const response = await request(server())
        .get(`/api/establishments/${establishmentId}/time-entries/export`)
        .expect(200);
      const rows = response.text.trim().split('\n');

      expect(response.headers['content-type']).toContain('text/csv');
      expect(rows[0]).toContain('dia;empleado;marca;hora');
      expect(rows).toHaveLength(3);
      expect(rows[2]).toContain('Olvido fichar');
    });
  });

  describe('the rota against what was really worked', () => {
    /*
     * The establishment's day, not the UTC one. Between 22:00 and midnight UTC in summer these are
     * already different dates, and a test that asks UTC for marks the domain filed under tomorrow
     * finds nothing.
     */
    const today = () => formatWorkdayDate(toWorkdayDate(new Date()));

    const scheduleToday = (startHour: number, endHour: number) => {
      const start = new Date(`${today()}T00:00:00.000Z`);
      start.setUTCHours(startHour);
      const end = new Date(`${today()}T00:00:00.000Z`);
      end.setUTCHours(endHour);

      return testSetup.prisma.dbShift.create({
        data: { establishmentId, userId: worker.id, startTime: start, endTime: end },
      });
    };

    const workdaysToday = async () =>
      (
        await request(server())
          .get(`/api/establishments/${establishmentId}/time-entries`)
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
      await request(server()).get(`/api/establishments/${establishmentId}/time-entries`).set(workerHeaders).expect(403);
    });

    it('should let whoever runs the establishment read it', async () => {
      await clockAs(TimeEntryType.CLOCK_IN, workerHeaders).expect(201);

      const response = await request(server()).get(`/api/establishments/${establishmentId}/time-entries`).expect(200);

      expect(response.body[0].userId).toBe(worker.id);
    });
  });
});
