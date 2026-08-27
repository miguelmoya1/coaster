import { Injectable, Logger } from '@nestjs/common';
import { FichitSettings } from './fichit-settings.service';

export interface FichitCompany {
  id: string;
  name: string;
  external_id?: string;
}

export interface FichitCompanyResult {
  existing: boolean;
  company: FichitCompany;
  work_center_id: string;
}

export interface FichitEmployee {
  id: string;
  full_name: string;
  external_id?: string;
}

export interface FichitEmployeeResult {
  employee: FichitEmployee;
  created: boolean;
}

export interface NewFichitCompany {
  externalId: string;
  name: string;
  taxId?: string | null;
  ownerName: string;
  ownerEmail: string;
}

export interface FichitSession {
  access_token: string;
  expires_at: string;
  refresh_token: string;
  subject_type: string;
  company_id: string;
}

export interface FichitEmployeeSync {
  externalId: string;
  fullName: string;
  email?: string | null;
}

export interface NewFichitPunch {
  employeeId: string;
  kind: string;
  occurredAt: string;
  reason: string;
}

export interface NewFichitShift {
  employeeId: string;
  startsAt: string;
  endsAt: string;
  note?: string | null;
}

export interface FichitShiftResult {
  id: string;
}

export class FichitError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FichitError';
  }
}

const COMPANY_HEADER = 'Fichit-Company';

@Injectable()
export class FichitApi {
  readonly #logger = new Logger(FichitApi.name);

  constructor(private readonly settings: FichitSettings) {}

  public async isEnabled(): Promise<boolean> {
    const { apiUrl, apiKey } = await this.settings.current();
    return Boolean(apiUrl && apiKey);
  }

  public async currentBaseUrl(): Promise<string> {
    return (await this.settings.current()).apiUrl;
  }

  public async createCompany(company: NewFichitCompany): Promise<FichitCompanyResult> {
    return this.#request<FichitCompanyResult>('POST', '/api/v1/partner/companies', {
      body: {
        external_id: company.externalId,
        name: company.name,
        tax_id: company.taxId ?? null,
        owner_name: company.ownerName,
        owner_email: company.ownerEmail,
      },
    });
  }

  public async listCompanies(): Promise<{ companies: FichitCompany[] }> {
    return this.#request<{ companies: FichitCompany[] }>('GET', '/api/v1/partner/companies');
  }

  public async syncEmployee(companyId: string, employee: FichitEmployeeSync): Promise<FichitEmployeeResult> {
    return this.#request<FichitEmployeeResult>('POST', '/api/v1/b2b/employees', {
      companyId,
      body: {
        external_id: employee.externalId,
        full_name: employee.fullName,
        email: employee.email ?? null,
      },
    });
  }

  public async openEmployeeSession(companyId: string, employeeId: string): Promise<FichitSession> {
    return this.#request<FichitSession>('POST', `/api/v1/partner/companies/${companyId}/sessions`, {
      body: { subject: 'employee', employee_id: employeeId },
    });
  }

  public async hasPunches(companyId: string): Promise<boolean> {
    const page = await this.#request<{ punches?: unknown[] }>('GET', '/api/v1/admin/punches?limit=1', {
      companyId,
    });
    return (page.punches ?? []).length > 0;
  }

  public async monthlyReport(companyId: string, year: number, month: number): Promise<unknown> {
    return this.#request('GET', `/api/v1/admin/reports/monthly?year=${year}&month=${month}`, { companyId });
  }

  public async punches(companyId: string, query: string): Promise<{ punches: unknown[] }> {
    return this.#request<{ punches: unknown[] }>('GET', `/api/v1/admin/punches?${query}`, { companyId });
  }

  public async integrity(companyId: string): Promise<unknown> {
    return this.#request('GET', '/api/v1/admin/integrity/verify', { companyId });
  }

  public async recordPunch(companyId: string, punch: NewFichitPunch): Promise<unknown> {
    return this.#request('POST', '/api/v1/admin/punches', {
      companyId,
      body: {
        employee_id: punch.employeeId,
        kind: punch.kind,
        occurred_at: punch.occurredAt,
        reason: punch.reason,
      },
    });
  }

  public async correctPunch(companyId: string, punchId: string, body: unknown): Promise<unknown> {
    return this.#request('POST', `/api/v1/admin/punches/${punchId}/corrections`, { companyId, body });
  }

  public async voidPunch(companyId: string, punchId: string, body: unknown): Promise<unknown> {
    return this.#request('POST', `/api/v1/admin/punches/${punchId}/void`, { companyId, body });
  }

  public async createShift(companyId: string, shift: NewFichitShift): Promise<FichitShiftResult> {
    return this.#request<FichitShiftResult>('POST', '/api/v1/admin/shifts', {
      companyId,
      body: {
        employee_id: shift.employeeId,
        starts_at: shift.startsAt,
        ends_at: shift.endsAt,
        note: shift.note ?? null,
      },
    });
  }

  public async deleteShift(companyId: string, shiftId: string): Promise<void> {
    await this.#request<void>('DELETE', `/api/v1/admin/shifts/${shiftId}`, { companyId });
  }

  public async deactivateEmployee(companyId: string, employeeId: string): Promise<void> {
    await this.#request<void>('DELETE', `/api/v1/admin/employees/${employeeId}`, { companyId });
  }

  async #request<T>(
    method: string,
    path: string,
    options: { companyId?: string; body?: unknown } = {},
  ): Promise<T> {
    const { apiUrl, apiKey } = await this.settings.current();
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
    if (options.companyId) {
      headers[COMPANY_HEADER] = options.companyId;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${apiUrl}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (cause) {
      this.#logger.warn(`Fichit unreachable on ${method} ${path}`);
      throw new FichitError(0, 'UNREACHABLE', `Fichit no responde: ${String(cause)}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!response.ok) {
      throw new FichitError(response.status, this.#codeOf(text), text || response.statusText);
    }

    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  #codeOf(payload: string): string {
    try {
      return (JSON.parse(payload) as { error?: { code?: string } }).error?.code ?? 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }
}
