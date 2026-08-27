import type { EstablishmentId, UserId } from '@coaster/common';
import { ClockState, TimeEntrySource, TimeEntryType, WorkdayDiscrepancy } from '@coaster/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FichitRepository } from '../data-access/fichit.repository';
import type { FichitApi } from './fichit-api.service';
import type { FichitSync } from './fichit-sync.service';
import { FichitTimeSheet } from './fichit-timesheet.service';

const establishmentId = 'est_1' as EstablishmentId;
const userId = 'usr_1' as UserId;

const day = (date: string, extra: Record<string, unknown> = {}) => ({
  date,
  worked_hours: 7.5,
  break_hours: 0.5,
  planned_hours: 8,
  variance_hours: -0.5,
  sessions: [{ start: `${date}T08:00:00Z`, end: `${date}T16:00:00Z`, breaks: [], open: false }],
  ...extra,
});

const report = (days: unknown[]) => ({
  company_id: 'c_1',
  timezone: 'Europe/Madrid',
  year: 2026,
  month: 8,
  employees: [{ employee_id: 'e_1', employee_name: 'Ana García', summary: { days } }],
});

describe('FichitTimeSheet', () => {
  let api: any;
  let sync: any;
  let repository: any;
  let sheet: FichitTimeSheet;

  beforeEach(() => {
    api = {
      monthlyReport: vi.fn().mockResolvedValue(report([day('2026-08-10')])),
      punches: vi.fn().mockResolvedValue({ punches: [] }),
      integrity: vi.fn(),
      recordPunch: vi.fn(),
      correctPunch: vi.fn(),
      voidPunch: vi.fn(),
    };
    sync = {
      ensureCompany: vi.fn().mockResolvedValue('c_1'),
      ensureEmployee: vi.fn().mockResolvedValue('e_1'),
    };
    repository = {
      linkedMembers: vi.fn().mockResolvedValue([{ userId: 'usr_1', fichitEmployeeId: 'e_1' }]),
    };

    sheet = new FichitTimeSheet(
      api as unknown as FichitApi,
      sync as unknown as FichitSync,
      repository as unknown as FichitRepository,
    );
  });

  describe('workdays', () => {
    it('turns a Fichit day into the workday the screens already draw', async () => {
      const [workday] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });

      expect(workday).toMatchObject({
        date: '2026-08-10',
        userId,
        userName: 'Ana García',
        state: ClockState.OUT,
        workedMinutes: 450,
        breakMinutes: 30,
        plannedMinutes: null,
      });
    });

    it('asks Fichit for every month the range touches', async () => {
      await sheet.workdays(establishmentId, { from: '2026-07-28', to: '2026-08-03' });

      expect(api.monthlyReport).toHaveBeenCalledWith('c_1', 2026, 7);
      expect(api.monthlyReport).toHaveBeenCalledWith('c_1', 2026, 8);
    });

    it('drops the days that fall outside the range asked for', async () => {
      api.monthlyReport.mockResolvedValue(report([day('2026-08-09'), day('2026-08-10'), day('2026-08-11')]));

      const days = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });

      expect(days.map((workday) => workday.date)).toEqual(['2026-08-10']);
    });

    it('reads a running session as clocked in, and one on a break as on a break', async () => {
      api.monthlyReport.mockResolvedValue(
        report([
          day('2026-08-10', {
            sessions: [{ start: '2026-08-10T08:00:00Z', end: '', breaks: [], open: true }],
          }),
        ]),
      );

      const [working] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });
      expect(working.state).toBe(ClockState.IN);

      api.monthlyReport.mockResolvedValue(
        report([
          day('2026-08-10', {
            sessions: [
              {
                start: '2026-08-10T08:00:00Z',
                end: '',
                breaks: [{ start: '2026-08-10T11:00:00Z', end: '' }],
                open: true,
              },
            ],
          }),
        ]),
      );

      const [resting] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });
      expect(resting.state).toBe(ClockState.ON_BREAK);
    });

    it('carries the roster over so the screen can contrast it', async () => {
      api.monthlyReport.mockResolvedValue(
        report([
          day('2026-08-10', {
            shifts: [{ starts_at: '2026-08-10T08:00:00Z', ends_at: '2026-08-10T16:00:00Z' }],
          }),
        ]),
      );

      const [workday] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });

      expect(workday.plannedMinutes).toBe(480);
      expect(workday.plannedStart).toBe('2026-08-10T08:00:00Z');
      expect(workday.discrepancies).toContain(WorkdayDiscrepancy.EARLY_FINISH);
    });

    it('flags a rostered day nobody worked, and a day worked with nothing rostered', async () => {
      api.monthlyReport.mockResolvedValue(
        report([
          day('2026-08-10', {
            worked_hours: 0,
            shifts: [{ starts_at: '2026-08-10T08:00:00Z', ends_at: '2026-08-10T16:00:00Z' }],
          }),
        ]),
      );
      const [missed] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });
      expect(missed.discrepancies).toContain(WorkdayDiscrepancy.NO_SHOW);

      api.monthlyReport.mockResolvedValue(report([day('2026-08-10')]));
      const [extra] = await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' });
      expect(extra.discrepancies).toContain(WorkdayDiscrepancy.UNPLANNED);
    });

    it('ignores an employee Coaster has no member for', async () => {
      repository.linkedMembers.mockResolvedValue([]);

      expect(await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' })).toEqual([]);
    });

    it('narrows to one person when asked', async () => {
      sync.ensureEmployee.mockResolvedValue('e_2');

      expect(await sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10', userId })).toEqual([]);
    });
  });

  describe('punches', () => {
    it('maps a punch into the entry the screens know', async () => {
      api.punches.mockResolvedValue({
        punches: [
          {
            id: 'p_1',
            seq: 4,
            employee_id: 'e_1',
            kind: 'in',
            occurred_at: '2026-08-10T08:00:00Z',
            recorded_at: '2026-08-10T08:00:01Z',
            source: 'kiosk',
            actor_type: 'employee',
            entry_type: 'original',
            hash: 'abc',
          },
        ],
      });

      const [entry] = await sheet.punches(establishmentId, { from: '2026-08-10', to: '2026-08-10' });

      expect(entry).toMatchObject({
        id: 'p_1',
        userId,
        type: TimeEntryType.CLOCK_IN,
        source: TimeEntrySource.EMPLOYEE_DEVICE,
        workdayDate: '2026-08-10',
        amended: false,
        voided: false,
      });
    });

    it('bounds the query by the range asked for', async () => {
      await sheet.punches(establishmentId, { from: '2026-08-01', to: '2026-08-31' });

      const [, query] = api.punches.mock.calls[0];
      expect(query).toContain('from=2026-08-01T00%3A00%3A00Z');
      expect(query).toContain('to=2026-08-31T23%3A59%3A59Z');
    });
  });

  describe('integrity', () => {
    it('reports the chain as Fichit verified it', async () => {
      api.integrity.mockResolvedValue({ intact: true, checked: 120 });

      expect(await sheet.integrity(establishmentId)).toEqual({
        establishmentId,
        checkedEntries: 120,
        valid: true,
        brokenAt: null,
      });
    });

    it('points at where the chain broke', async () => {
      api.integrity.mockResolvedValue({ intact: false, checked: 120, violations: [{ seq: 42 }] });

      expect(await sheet.integrity(establishmentId)).toMatchObject({ valid: false, brokenAt: '42' });
    });
  });

  describe('writing', () => {
    it('records a manual punch against the right employee', async () => {
      await sheet.record(establishmentId, {
        userId,
        type: 'CLOCK_IN',
        occurredAt: '2026-08-10T08:00:00Z',
        reason: 'se le olvidó fichar',
      });

      expect(api.recordPunch).toHaveBeenCalledWith('c_1', {
        employeeId: 'e_1',
        kind: 'in',
        occurredAt: '2026-08-10T08:00:00Z',
        reason: 'se le olvidó fichar',
      });
    });

    it('refuses to work at all when the establishment is not linked', async () => {
      sync.ensureCompany.mockResolvedValue(null);

      await expect(
        sheet.workdays(establishmentId, { from: '2026-08-10', to: '2026-08-10' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
