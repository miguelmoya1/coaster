import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { AdminAuditLogEntry } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

const ACTION_ICONS: Record<string, string> = {
  ESTABLISHMENT_PLAN_GRANTED: 'workspace_premium',
  ESTABLISHMENT_PLAN_REVOKED: 'remove_moderator',
  ESTABLISHMENT_RENAMED: 'edit',
  ESTABLISHMENT_MEMBER_ROLE_CHANGED: 'manage_accounts',
  USER_ROLE_CHANGED: 'shield_person',
  USER_ACTIVATION_CHANGED: 'toggle_on',
};

@Component({
  selector: 'coaster-audit-list',
  imports: [MatIcon, DatePipe, TranslatePipe],
  template: `
    <ul class="flex flex-col divide-y divide-outline-variant/30">
      @for (entry of entries(); track entry.id) {
        <li class="flex items-start gap-3 py-3">
          <span class="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">{{ iconFor(entry.action) }}</mat-icon>
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm text-on-surface">
              <span class="font-medium">{{ 'admin.audit_action.' + entry.action.toLowerCase() | translate }}</span>
              @if (entry.targetLabel) {
                <span class="text-on-surface-variant"> · {{ entry.targetLabel }}</span>
              }
            </p>

            <p class="text-xs text-on-surface-variant mt-0.5">
              {{ entry.actorName }} · {{ entry.createdAt | date: 'dd/MM/yyyy HH:mm' }}
            </p>

            @if (entry.reason) {
              <p class="text-xs text-on-surface-variant italic mt-1">"{{ entry.reason }}"</p>
            }

            @if (describe(entry); as detail) {
              <p class="text-xs text-on-surface-variant/80 mt-1 font-mono break-all">{{ detail }}</p>
            }
          </div>
        </li>
      } @empty {
        <li class="py-6 text-center text-sm text-on-surface-variant">
          {{ 'admin.audit.empty' | translate }}
        </li>
      }
    </ul>
  `,
  host: { class: 'block' },
})
export class AuditList {
  public readonly entries = input.required<AdminAuditLogEntry[]>();

  protected iconFor(action: string): string {
    return ACTION_ICONS[action] ?? 'bolt';
  }

  protected describe(entry: AdminAuditLogEntry): string | null {
    if (!entry.metadata) {
      return null;
    }

    const parts = Object.entries(entry.metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`);

    return parts.length > 0 ? parts.join(' · ') : null;
  }
}
