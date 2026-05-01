import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBadge, CoasterTitle } from '../../../shared';

@Component({
  selector: 'coaster-staff-member-card',
  imports: [NgIcon, TranslatePipe, CoasterBadge, CoasterTitle],
  viewProviders: [provideIcons({ lucideMail, lucideTrash2 })],
  template: `
    <div [class]="'absolute left-0 top-0 bottom-0 w-1 ' + (isOffDuty() ? 'bg-outline-variant' : 'bg-primary')"></div>

    <div [class]="'w-16 h-16 rounded-xl overflow-hidden shrink-0 ' + (isOffDuty() ? 'grayscale' : '')">
      <img [src]="staffImage()" class="w-full h-full object-cover" alt="Staff Member" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 coaster-title class="truncate">
          {{ staffName() }}
        </h3>
        @if (!isOffDuty()) {
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        }
      </div>
      <p class="text-on-surface-variant body-md">
        {{ 'common.role.' + roleName().toLowerCase() | translate }}
      </p>
      <div class="mt-2 flex items-center gap-2">
        @if (isOffDuty()) {
          <span coaster-badge variant="neutral">
            {{ 'common.duty.off' | translate }}
          </span>
        } @else {
          <span coaster-badge variant="success">
            {{ 'common.duty.on' | translate }}
          </span>
        }
      </div>
    </div>

    <div class="flex gap-2">
      <!-- <button [disabled]="disabled()" [class]="'w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ' + (isOffDuty() ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-bright text-primary hover:bg-surface-container-highest')">
        <ng-icon name="lucidePhone" class="text-xl" />
      </button>
      <button [disabled]="disabled()" [class]="'w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ' + (isOffDuty() ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-bright text-primary hover:bg-surface-container-highest')">
        <ng-icon name="lucideMessageSquare" class="text-xl" />
      </button> -->

      <button
        [disabled]="disabled()"
        [class]="
          'w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ' +
          (isOffDuty()
            ? 'bg-surface-container-high text-on-surface-variant'
            : 'bg-surface-bright text-primary hover:bg-surface-container-highest')
        "
      >
        <a [href]="'mailto:' + staffEmail()">
          <ng-icon name="lucideMail" class="text-xl" />
        </a>
      </button>

      @if (showDeleteButton()) {
        <button
          [disabled]="disabled()"
          class="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 bg-error/10 text-error hover:bg-error/20"
          (click)="onDeleteClick($event)"
        >
          <ng-icon name="lucideTrash2" class="text-xl" />
        </button>
      }
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]':
      "'rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden block ' + (isOffDuty() ? 'bg-surface-container-low opacity-60' : 'bg-surface-container')",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly staffEmail = input.required<string>();
  readonly roleName = input.required<string>();
  readonly isOffDuty = input(false);
  readonly disabled = input(false);
  readonly showDeleteButton = input(false);
  readonly deleteClicked = output<void>();

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
