import type { EstablishmentId, TimeEntry, UserId, Workday } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FichitRepository } from '../data-access/fichit.repository';
import { toPunchKind, toTimeEntry, toWorkday } from '../mappers/workday.mapper';
import { toTimeSheetCsv } from '../utils/time-sheet-csv';
import { FichitApi } from './fichit-api.service';
import { FichitSync } from './fichit-sync.service';
import type { FichitCompanyMonth, FichitIntegrity, FichitPunch } from './fichit-timesheet.types';

export interface TimeSheetQuery {
  from: string;
  to: string;
  userId?: UserId;
}

const monthsBetween = (from: string, to: string): { year: number; month: number }[] => {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const months: { year: number; month: number }[] = [];

  for (
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    cursor <= end;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  ) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
  }

  return months;
};

export interface TimeSheetIntegrity {
  establishmentId: EstablishmentId;
  checkedEntries: number;
  valid: boolean;
  brokenAt: string | null;
}

export interface ManualPunch {
  userId: UserId;
  type: string;
  occurredAt: string;
  reason: string;
}

export interface PunchCorrection {
  type?: string;
  occurredAt?: string;
  reason: string;
}

@Injectable()
export class FichitTimeSheet {
  constructor(
    private readonly api: FichitApi,
    private readonly sync: FichitSync,
    private readonly repository: FichitRepository,
  ) {}

  public async workdays(establishmentId: EstablishmentId, query: TimeSheetQuery): Promise<Workday[]> {
    const companyId = await this.#companyOf(establishmentId);
    const wanted = query.userId ? await this.#employeeOf(establishmentId, query.userId) : undefined;
    const byEmployee = await this.#usersByEmployee(establishmentId);

    const reports = await Promise.all(
      monthsBetween(query.from, query.to).map(
        (period) => this.api.monthlyReport(companyId, period.year, period.month) as Promise<FichitCompanyMonth>,
      ),
    );

    const entries = await this.punches(establishmentId, query);

    return reports
      .flatMap((report) => report.employees)
      .filter((employee) => !wanted || employee.employee_id === wanted)
      .flatMap((employee) => {
        const userId = byEmployee.get(employee.employee_id);
        if (!userId) {
          return [];
        }

        return employee.summary.days
          .filter((day) => day.date >= query.from && day.date <= query.to)
          .map((day) => ({
            ...toWorkday(employee, day, userId),
            entries: entries.filter((entry) => entry.userId === userId && entry.workdayDate === day.date),
          }));
      });
  }

  public async exportCsv(establishmentId: EstablishmentId, query: TimeSheetQuery): Promise<string> {
    return toTimeSheetCsv(await this.workdays(establishmentId, query));
  }

  public async punches(establishmentId: EstablishmentId, query: TimeSheetQuery): Promise<TimeEntry[]> {
    const companyId = await this.#companyOf(establishmentId);
    const byEmployee = await this.#usersByEmployee(establishmentId);

    const params = new URLSearchParams({
      limit: '500',
      from: `${query.from}T00:00:00Z`,
      to: `${query.to}T23:59:59Z`,
    });
    if (query.userId) {
      params.set('employee_id', await this.#employeeOf(establishmentId, query.userId));
    }

    const { punches } = await this.api.punches(companyId, params.toString());

    return (punches as FichitPunch[]).flatMap((punch) => {
      const userId = byEmployee.get(punch.employee_id);
      return userId ? [toTimeEntry(punch, establishmentId, userId, '')] : [];
    });
  }

  public async integrity(establishmentId: EstablishmentId): Promise<TimeSheetIntegrity> {
    const companyId = await this.#companyOf(establishmentId);
    const report = (await this.api.integrity(companyId)) as FichitIntegrity;

    return {
      establishmentId,
      checkedEntries: report.checked,
      valid: report.intact,
      brokenAt: report.violations?.[0] ? String(report.violations[0].seq) : null,
    };
  }

  public async record(establishmentId: EstablishmentId, punch: ManualPunch): Promise<void> {
    const companyId = await this.#companyOf(establishmentId);
    const employeeId = await this.#employeeOf(establishmentId, punch.userId);

    await this.api.recordPunch(companyId, {
      employeeId,
      kind: toPunchKind(punch.type),
      occurredAt: punch.occurredAt,
      reason: punch.reason,
    });
  }

  public async correct(
    establishmentId: EstablishmentId,
    punchId: string,
    correction: PunchCorrection,
  ): Promise<void> {
    await this.api.correctPunch(await this.#companyOf(establishmentId), punchId, {
      occurred_at: correction.occurredAt,
      kind: correction.type ? toPunchKind(correction.type) : undefined,
      reason: correction.reason,
    });
  }

  public async void(establishmentId: EstablishmentId, punchId: string, reason: string): Promise<void> {
    await this.api.voidPunch(await this.#companyOf(establishmentId), punchId, { reason });
  }

  async #companyOf(establishmentId: EstablishmentId): Promise<string> {
    const companyId = await this.sync.ensureCompany(establishmentId);
    if (!companyId) {
      throw new ServiceUnavailableException(ErrorCodes.FICHIT_NOT_AVAILABLE);
    }
    return companyId;
  }

  async #employeeOf(establishmentId: EstablishmentId, userId: UserId): Promise<string> {
    const employeeId = await this.sync.ensureEmployee(establishmentId, userId);
    if (!employeeId) {
      throw new ServiceUnavailableException(ErrorCodes.FICHIT_NOT_AVAILABLE);
    }
    return employeeId;
  }

  async #usersByEmployee(establishmentId: EstablishmentId): Promise<Map<string, UserId>> {
    const members = await this.repository.linkedMembers(establishmentId);

    return new Map(
      members.flatMap((member) =>
        member.fichitEmployeeId ? [[member.fichitEmployeeId, member.userId as UserId] as const] : [],
      ),
    );
  }
}
