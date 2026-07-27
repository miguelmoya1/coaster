import { Component, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'coaster-page-header',
  imports: [MatIcon, MatIconButton, RouterLink],
  template: `
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-outline-variant/40"
    >
      <div class="flex items-start gap-3 min-w-0">
        @if (backUrl(); as url) {
          <button
            mat-icon-button
            [routerLink]="url"
            class="mt-0.5 shrink-0 text-on-surface-variant hover:text-on-surface"
            aria-label="Volver"
          >
            <mat-icon>arrow_back</mat-icon>
          </button>
        }

        <div class="flex flex-col min-w-0">
          @if (badge(); as b) {
            <div class="flex items-center gap-2 mb-1">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider"
              >
                {{ b }}
              </span>
            </div>
          }

          <h1 class="heading-1 font-bold text-on-surface text-2xl sm:text-3xl tracking-tight truncate">
            {{ title() }}
          </h1>

          @if (subtitle(); as sub) {
            <p class="text-on-surface-variant text-sm sm:text-base mt-1 leading-relaxed">
              {{ sub }}
            </p>
          }
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0 self-start sm:self-center">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class PageHeader {
  public readonly title = input.required<string>();
  public readonly subtitle = input<string | undefined>(undefined);
  public readonly badge = input<string | undefined>(undefined);
  public readonly backUrl = input<string | any[] | undefined>(undefined);
}
