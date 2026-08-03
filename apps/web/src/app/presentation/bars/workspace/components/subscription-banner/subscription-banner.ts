import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bars';

@Component({
  selector: 'coaster-subscription-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (subStore.isReadOnly()) {
      <div
        class="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-300"
      >
        <div class="flex items-center gap-2 min-w-0">
          <mat-icon class="text-amber-600 dark:text-amber-400 shrink-0 text-base sm:text-lg">lock</mat-icon>
          <span class="truncate"> Tu periodo de prueba ha finalizado. La aplicación está en modo lectura. </span>
        </div>
        <button
          type="button"
          mat-flat-button
          color="primary"
          class="!rounded-xl !text-xs shrink-0"
          (click)="planDialogService.open()"
        >
          Activar Plan Premium
        </button>
      </div>
    } @else if (subStore.isTrialExpiringSoon()) {
      <div
        class="w-full bg-blue-500/10 border-b border-blue-500/20 text-blue-950 dark:text-blue-200 px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-300"
      >
        <div class="flex items-center gap-2 min-w-0">
          <mat-icon class="text-blue-600 dark:text-blue-400 shrink-0 text-base sm:text-lg">timer</mat-icon>
          <span class="truncate">
            Quedan <strong>{{ subStore.trialDaysRemaining() }}</strong>
            {{ subStore.trialDaysRemaining() === 1 ? 'día' : 'días' }} de prueba. ¡Suscríbete para mantener tus
            funciones activas!
          </span>
        </div>
        <button
          type="button"
          mat-stroked-button
          class="!rounded-xl !text-xs shrink-0"
          (click)="planDialogService.open()"
        >
          Ver Planes
        </button>
      </div>
    }
  `,
  host: {
    class: 'block w-full',
  },
})
export class SubscriptionBanner {
  protected readonly subStore = inject(BarSubscriptionStore);
  protected readonly planDialogService = inject(PlanDialogService);
}
