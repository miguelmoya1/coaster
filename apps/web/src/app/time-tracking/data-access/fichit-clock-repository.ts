import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, TimeEntryType } from '@coaster/common';
import { ClockState } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

export interface FichitSession {
  access_token: string;
  expires_at: string;
  refresh_token: string;
}

export interface ClockingHandover {
  baseUrl: string;
  companyId: string;
  employeeId: string;
  session: FichitSession;
}

export interface FichitStatus {
  state: string;
  state_label: string;
  state_since?: string;
  elapsed_minutes?: number;
}

export const CLOCK_STATE: Record<string, ClockState> = {
  out: ClockState.OUT,
  in: ClockState.IN,
  on_break: ClockState.ON_BREAK,
};

const KIND: Record<string, string> = {
  CLOCK_IN: 'in',
  CLOCK_OUT: 'out',
  BREAK_START: 'break_start',
  BREAK_END: 'break_end',
};

@Service()
export class FichitClockRepository {
  readonly #http = inject(HttpClient);

  public handover(establishmentId: EstablishmentId): Promise<ClockingHandover> {
    return firstValueFrom(
      this.#http.post<ClockingHandover>(`/establishments/${establishmentId}/time-entries/session`, {}),
    );
  }

  public punch(
    handover: ClockingHandover,
    type: TimeEntryType,
    where?: { latitude: number; longitude: number },
  ): Promise<unknown> {
    return firstValueFrom(
      this.#http.post(
        `${handover.baseUrl}/api/v1/me/punches`,
        { kind: KIND[type] ?? type, ...where },
        {
          headers: {
            Authorization: `Bearer ${handover.session.access_token}`,
            'Idempotency-Key': crypto.randomUUID(),
          },
        },
      ),
    );
  }

  public status(handover: ClockingHandover): Promise<FichitStatus> {
    return firstValueFrom(
      this.#http.get<FichitStatus>(`${handover.baseUrl}/api/v1/me/status`, {
        headers: { Authorization: `Bearer ${handover.session.access_token}` },
      }),
    );
  }
}
