import { Component, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-admin-pagination',
  imports: [MatIcon, MatIconButton, TranslatePipe],
  template: `
    <div class="flex items-center justify-between gap-4 pt-4 border-t border-outline-variant/40">
      <p class="text-sm text-on-surface-variant">
        {{ 'admin.pagination.range' | translate: { from: from(), to: to(), total: total() } }}
      </p>

      <div class="flex items-center gap-1">
        <button
          mat-icon-button
          type="button"
          [disabled]="page() <= 1"
          [attr.aria-label]="'admin.pagination.previous' | translate"
          (click)="pageChange.emit(page() - 1)"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>

        <span class="text-sm font-medium tabular-nums px-1">{{ page() }} / {{ totalPages() }}</span>

        <button
          mat-icon-button
          type="button"
          [disabled]="page() >= totalPages()"
          [attr.aria-label]="'admin.pagination.next' | translate"
          (click)="pageChange.emit(page() + 1)"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class AdminPagination {
  public readonly page = input.required<number>();
  public readonly pageSize = input.required<number>();
  public readonly total = input.required<number>();
  public readonly totalPages = input.required<number>();

  public readonly pageChange = output<number>();

  protected readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
