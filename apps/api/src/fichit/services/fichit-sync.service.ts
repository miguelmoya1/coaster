import type { EstablishmentId, UserId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { FichitRepository } from '../data-access/fichit.repository';
import { FichitApi, FichitError, FichitSession } from './fichit-api.service';

export interface ClockingHandover {
  baseUrl: string;
  companyId: string;
  employeeId: string;
  session: FichitSession;
}

export interface BackfillReport {
  companies: number;
  employees: number;
  failed: number;
}

const BACKFILL_BATCH = 200;

@Injectable()
export class FichitSync {
  readonly #logger = new Logger(FichitSync.name);

  constructor(
    private readonly api: FichitApi,
    private readonly repository: FichitRepository,
  ) {}

  public enabled(): Promise<boolean> {
    return this.api.isEnabled();
  }

  public async ensureCompany(establishmentId: EstablishmentId): Promise<string | null> {
    if (!(await this.enabled())) {
      return null;
    }

    const establishment = await this.repository.establishment(establishmentId);
    if (!establishment) {
      return null;
    }
    if (establishment.fichitCompanyId) {
      return establishment.fichitCompanyId;
    }

    const owner = await this.repository.owner(establishmentId);
    if (!owner) {
      this.#logger.warn(`Establishment ${establishmentId} has no owner yet; leaving it unlinked`);
      return null;
    }

    const result = await this.api.createCompany({
      externalId: establishment.id,
      name: establishment.name,
      taxId: establishment.taxId,
      ownerName: owner.name,
      ownerEmail: owner.email,
    });

    await this.repository.linkCompany(establishmentId, result.company.id);
    this.#logger.log(
      `Establishment ${establishmentId} ${result.existing ? 'matched' : 'created'} Fichit company ${result.company.id}`,
    );

    return result.company.id;
  }

  public async ensureEmployee(establishmentId: EstablishmentId, userId: UserId): Promise<string | null> {
    if (!(await this.enabled())) {
      return null;
    }

    const member = await this.repository.member(establishmentId, userId);
    if (!member || member.deletedAt) {
      return null;
    }

    const companyId = await this.ensureCompany(establishmentId);
    if (!companyId) {
      return null;
    }

    const result = await this.api.syncEmployee(companyId, {
      externalId: member.userId,
      fullName: member.user.name,
      email: member.user.email,
    });

    if (member.fichitEmployeeId !== result.employee.id) {
      await this.repository.linkEmployee(member.id, result.employee.id);
    }

    return result.employee.id;
  }

  public async retireEmployee(establishmentId: EstablishmentId, userId: UserId): Promise<void> {
    if (!(await this.enabled())) {
      return;
    }

    const member = await this.repository.member(establishmentId, userId);
    const establishment = await this.repository.establishment(establishmentId);
    if (!member?.fichitEmployeeId || !establishment?.fichitCompanyId) {
      return;
    }

    try {
      await this.api.deactivateEmployee(establishment.fichitCompanyId, member.fichitEmployeeId);
    } catch (error) {
      if (error instanceof FichitError && error.status === 404) {
        return;
      }
      throw error;
    }
  }

  public async handOverClocking(
    establishmentId: EstablishmentId,
    userId: UserId,
  ): Promise<ClockingHandover | null> {
    const companyId = await this.ensureCompany(establishmentId);
    const employeeId = await this.ensureEmployee(establishmentId, userId);
    if (!companyId || !employeeId) {
      return null;
    }

    return {
      baseUrl: await this.api.currentBaseUrl(),
      companyId,
      employeeId,
      session: await this.api.openEmployeeSession(companyId, employeeId),
    };
  }

  public async mirrorShift(shiftId: string): Promise<string | null> {
    if (!(await this.enabled())) {
      return null;
    }

    const shift = await this.repository.shift(shiftId);
    if (!shift || shift.fichitShiftId) {
      return shift?.fichitShiftId ?? null;
    }

    const establishmentId = shift.establishmentId as EstablishmentId;

    const companyId = await this.ensureCompany(establishmentId);
    const employeeId = await this.ensureEmployee(establishmentId, shift.userId as UserId);
    if (!companyId || !employeeId) {
      return null;
    }

    const created = await this.api.createShift(companyId, {
      employeeId,
      startsAt: shift.startTime.toISOString(),
      endsAt: shift.endTime.toISOString(),
      note: shift.notes,
    });

    await this.repository.linkShift(shift.id, created.id);
    return created.id;
  }

  public async removeMirroredShift(establishmentId: EstablishmentId, shiftId: string): Promise<void> {
    if (!(await this.enabled())) {
      return;
    }

    const shift = await this.repository.shift(shiftId);
    const establishment = await this.repository.establishment(establishmentId);
    if (!shift?.fichitShiftId || !establishment?.fichitCompanyId) {
      return;
    }

    try {
      await this.api.deleteShift(establishment.fichitCompanyId, shift.fichitShiftId);
    } catch (error) {
      if (!(error instanceof FichitError) || error.status !== 404) {
        throw error;
      }
    }

    await this.repository.linkShift(shift.id, null);
  }

  public async backfill(): Promise<BackfillReport> {
    const report: BackfillReport = { companies: 0, employees: 0, failed: 0 };
    if (!(await this.enabled())) {
      return report;
    }

    for (const { id } of await this.repository.establishmentsWithoutCompany(BACKFILL_BATCH)) {
      try {
        if (await this.ensureCompany(id as EstablishmentId)) {
          report.companies += 1;
        }
      } catch (error) {
        report.failed += 1;
        this.#logger.error(`Could not link establishment ${id} to Fichit`, error);
      }
    }

    for (const { establishmentId, userId } of await this.repository.membersWithoutEmployee(BACKFILL_BATCH)) {
      try {
        if (await this.ensureEmployee(establishmentId as EstablishmentId, userId as UserId)) {
          report.employees += 1;
        }
      } catch (error) {
        report.failed += 1;
        this.#logger.error(`Could not link member ${userId} of ${establishmentId} to Fichit`, error);
      }
    }

    return report;
  }
}
