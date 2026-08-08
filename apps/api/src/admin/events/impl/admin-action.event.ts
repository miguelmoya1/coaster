import type { RecordAuditEntry } from '../../data-access/admin-audit.repository';

export class AdminActionEvent {
  constructor(public readonly entry: RecordAuditEntry) {}
}
