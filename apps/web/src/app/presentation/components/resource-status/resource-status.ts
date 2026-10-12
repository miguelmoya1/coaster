import { Component, computed, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { getErrorMessage, type PageResource } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../loading/loading';

@Component({
  selector: 'coaster-resource-status',
  imports: [Loading, MatButton, MatIcon, TranslatePipe],
  template: `
    @if (failed(); as failed) {
      <div
        role="alert"
        class="flex flex-col items-center gap-3 rounded-2xl border border-error/30 bg-error/10 p-4 text-center text-sm text-on-surface"
      >
        <span>{{ message(failed) | translate }}</span>
        <button mat-stroked-button type="button" (click)="failed.reload()">
          <mat-icon>refresh</mat-icon>
          {{ 'common.retry' | translate }}
        </button>
      </div>
    } @else if (loading()) {
      <coaster-loading />
    }
  `,
  host: { class: 'contents' },
})
export class ResourceStatus {
  public readonly resource = input.required<PageResource<unknown> | readonly PageResource<unknown>[]>();

  readonly #resources = computed(() => [this.resource()].flat());

  protected readonly failed = computed(() => this.#resources().find((resource) => resource.status() === 'error'));
  protected readonly loading = computed(() => this.#resources().some((resource) => resource.status() === 'loading'));

  protected message(resource: PageResource<unknown>): string {
    return getErrorMessage(resource.error());
  }
}
