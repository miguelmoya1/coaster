export interface FichitInterval {
  start: string;
  end: string;
}

export interface FichitSession {
  start: string;
  end: string;
  breaks: FichitInterval[];
  open: boolean;
}

export interface FichitAnomaly {
  kind: string;
  at: string;
  detail: string;
}

export interface FichitPlannedShift {
  starts_at: string;
  ends_at: string;
}

export interface FichitDay {
  date: string;
  worked_hours: number;
  break_hours: number;
  planned_hours: number;
  variance_hours: number;
  sessions: FichitSession[];
  shifts?: FichitPlannedShift[];
  anomalies?: FichitAnomaly[];
}

export interface FichitEmployeeMonth {
  employee_id: string;
  employee_name: string;
  summary: { days: FichitDay[] };
}

export interface FichitCompanyMonth {
  company_id: string;
  timezone: string;
  year: number;
  month: number;
  employees: FichitEmployeeMonth[];
}

export interface FichitPunch {
  id: string;
  seq: number;
  employee_id: string;
  kind: string;
  occurred_at: string;
  recorded_at: string;
  source: string;
  actor_type: string;
  entry_type: string;
  supersedes_id?: string;
  reason?: string;
  latitude?: number;
  longitude?: number;
  hash: string;
}

export interface FichitIntegrity {
  intact: boolean;
  checked: number;
  violations?: { seq: number }[];
}
