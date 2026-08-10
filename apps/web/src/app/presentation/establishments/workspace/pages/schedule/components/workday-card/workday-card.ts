import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { TimeEntry, Workday } from '@coaster/common';
import { TimeEntryAction, TimeEntrySource, WorkdayDiscrepancy } from '@coaster/common';
import { DateFormatterService } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface WorkdayEntryItem {
  entry: TimeEntry;
  time: string;
  typeLabel: string;
  manual: boolean;
  revisions: { label: string; detail: string }[];
}

@Component({
  selector: 'coaster-workday-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MatIconButton, MatTooltip, TranslatePipe],
  host: { class: 'block' },
  template: `
    <article class="flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container p-4">
      <header class="flex items-center gap-3">
        <div class="flex flex-col min-w-0">
          <span class="truncate text-white font-bold title-lg">{{ workday().userName }}</span>
          <span class="text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
            {{ workday().date }}
          </span>
        </div>

        <div class="ml-auto flex items-center gap-4 text-right">
          <div class="flex flex-col">
            <span class="text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
              {{ 'schedule.time_tracking.worked' | translate }}
            </span>
            <span class="text-primary text-xl font-black tracking-tighter">{{ workedLabel() }}</span>
          </div>
          @if (plannedLabel(); as planned) {
            <div class="flex flex-col">
              <span class="text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
                {{ 'schedule.time_tracking.planned' | translate }}
              </span>
              <span class="text-on-surface text-xl font-black tracking-tighter">{{ planned }}</span>
            </div>
          }
        </div>
      </header>

      @if (workday().discrepancies.length > 0) {
        <div class="flex flex-wrap gap-1.5 mb-2">
          @for (discrepancy of workday().discrepancies; track discrepancy) {
            <span
              class="rounded-full px-2 py-0.5 text-xxs font-bold uppercase tracking-wider"
              [class]="badgeClass(discrepancy)"
            >
              {{ 'schedule.time_tracking.discrepancy_' + discrepancy.toLowerCase() | translate }}
            </span>
          }
        </div>
      }

      <ul class="flex flex-col gap-2">
        @for (item of items(); track item.entry.id) {
          <li class="flex items-start gap-3 rounded-xl bg-surface-container-high px-3 py-2">
            <span
              class="text-primary font-black tracking-tighter text-lg tabular-nums"
              [class.line-through]="item.entry.voided"
              [class.opacity-50]="item.entry.voided"
            >
              {{ item.time }}
            </span>

            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-bold text-white" [class.opacity-50]="item.entry.voided">
                {{ item.typeLabel | translate }}
              </span>

              <div class="flex flex-wrap gap-1.5 mt-1">
                @if (item.manual) {
                  <span
                    class="rounded-full bg-surface-container-highest px-2 py-0.5 text-xxs font-bold uppercase tracking-wider text-on-surface-variant"
                  >
                    {{ 'schedule.time_tracking.badge_manual' | translate }}
                  </span>
                }
                @if (item.entry.amended && !item.entry.voided) {
                  <span
                    class="rounded-full bg-tertiary/15 px-2 py-0.5 text-xxs font-bold uppercase tracking-wider text-tertiary"
                  >
                    {{ 'schedule.time_tracking.badge_amended' | translate }}
                  </span>
                }
                @if (item.entry.voided) {
                  <span
                    class="rounded-full bg-error/15 px-2 py-0.5 text-xxs font-bold uppercase tracking-wider text-error"
                  >
                    {{ 'schedule.time_tracking.badge_voided' | translate }}
                  </span>
                }
              </div>

              @if (item.revisions.length > 1) {
                <details class="mt-2">
                  <summary class="cursor-pointer text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
                    {{ 'schedule.time_tracking.history' | translate }} ({{ item.revisions.length }})
                  </summary>
                  <ol class="mt-2 flex flex-col gap-1 border-l border-outline-variant/30 pl-3">
                    @for (revision of item.revisions; track revision.detail) {
                      <li class="text-xs leading-tight text-on-surface-variant">
                        <span class="font-bold text-on-surface">{{ revision.label | translate }}</span>
                        — {{ revision.detail }}
                      </li>
                    }
                  </ol>
                </details>
              }
            </div>

            @if (!item.entry.voided && (canManage() || canAmend())) {
              <div class="flex shrink-0 gap-1">
                <button
                  mat-icon-button
                  type="button"
                  [disabled]="disabled()"
                  [matTooltip]="'schedule.time_tracking.amend' | translate"
                  [attr.aria-label]="'schedule.time_tracking.amend' | translate"
                  (click)="amend.emit(item.entry)"
                >
                  <mat-icon>edit</mat-icon>
                </button>

                @if (canManage()) {
                  <button
                    mat-icon-button
                    type="button"
                    [disabled]="disabled()"
                    [matTooltip]="'schedule.time_tracking.void' | translate"
                    [attr.aria-label]="'schedule.time_tracking.void' | translate"
                    (click)="voidEntry.emit(item.entry)"
                  >
                    <mat-icon>block</mat-icon>
                  </button>
                }
              </div>
            }
          </li>
        } @empty {
          <li class="py-4 text-center text-sm text-on-surface-variant">
            {{ 'schedule.time_tracking.no_entries' | translate }}
          </li>
        }
      </ul>
    </article>
  `,
})
export class WorkdayCard {
  readonly #dateFormatter = inject(DateFormatterService);

  public readonly workday = input.required<Workday>();
  public readonly canManage = input(false);
  public readonly canAmend = input(false);
  public readonly disabled = input(false);

  public readonly amend = output<TimeEntry>();
  public readonly voidEntry = output<TimeEntry>();

  protected readonly workedLabel = computed(() => this.#dateFormatter.formatDuration(this.workday().workedMinutes));

  protected badgeClass(discrepancy: WorkdayDiscrepancy): string {
    return discrepancy === WorkdayDiscrepancy.OVERTIME
      ? 'bg-primary/15 text-primary'
      : 'bg-secondary/15 text-secondary';
  }

  protected readonly plannedLabel = computed(() => {
    const planned = this.workday().plannedMinutes;
    return planned === null ? undefined : this.#dateFormatter.formatDuration(planned);
  });

  protected readonly items = computed<WorkdayEntryItem[]>(() =>
    this.workday().entries.map((entry) => ({
      entry,
      time: this.#dateFormatter.formatTime(entry.occurredAt),
      typeLabel: `schedule.time_tracking.type_${entry.type.toLowerCase()}`,
      manual: entry.source === TimeEntrySource.MANUAL,
      revisions: entry.revisions.map((revision) => ({
        label: `schedule.time_tracking.action_${revision.action.toLowerCase()}`,
        detail: this.#revisionDetail(revision.action, revision.occurredAt, revision.actorName, revision.reason),
      })),
    })),
  );

  #revisionDetail(
    action: TimeEntryAction,
    occurredAt: string,
    actorName: string | null,
    reason: string | null,
  ): string {
    const hour = this.#dateFormatter.formatTime(occurredAt);
    const author = actorName ?? '';
    const detail = action === TimeEntryAction.VOIDED ? author : `${hour} · ${author}`;

    return reason ? `${detail} · ${reason}` : detail;
  }
}
