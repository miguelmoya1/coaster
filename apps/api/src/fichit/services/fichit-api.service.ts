import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

export interface FichitEmployeeSync {
  externalId: string;
  fullName: string;
  email?: string | null;
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

  constructor(private readonly _configService: ConfigService) {}

  public get enabled(): boolean {
    return Boolean(this.#baseUrl && this.#apiKey);
  }

  get #baseUrl(): string {
    return (this._configService.get<string>('FICHIT_API_URL') ?? '').replace(/\/+$/, '');
  }

  get #apiKey(): string {
    return this._configService.get<string>('FICHIT_API_KEY') ?? '';
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

  public async deactivateEmployee(companyId: string, employeeId: string): Promise<void> {
    await this.#request<void>('DELETE', `/api/v1/admin/employees/${employeeId}`, { companyId });
  }

  async #request<T>(
    method: string,
    path: string,
    options: { companyId?: string; body?: unknown } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.#apiKey}` };
    if (options.companyId) {
      headers[COMPANY_HEADER] = options.companyId;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
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
