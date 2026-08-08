import type { Workday } from '@coaster/common';

const HEADERS = [
  'dia',
  'empleado',
  'marca',
  'hora',
  'origen',
  'accion',
  'motivo',
  'autor',
  'registrado',
  'hash',
] as const;

const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const toTimeSheetCsv = (workdays: Workday[]): string => {
  const rows = [HEADERS.join(';')];

  for (const workday of workdays) {
    for (const entry of workday.entries) {
      for (const revision of entry.revisions) {
        rows.push(
          [
            workday.date,
            entry.userName,
            revision.type,
            revision.occurredAt,
            revision.source,
            revision.action,
            revision.reason ?? '',
            revision.actorName ?? revision.actorId,
            revision.recordedAt,
            revision.hash,
          ]
            .map(escape)
            .join(';'),
        );
      }
    }
  }

  return rows.join('\n');
};
