import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterTitle } from '../../../../../../components/typography/typography';

@Component({
  selector: 'coaster-staff-member-card',
  imports: [NgIcon, TranslatePipe, CoasterTitle],
  viewProviders: [provideIcons({ lucideMail, lucideTrash2 })],
  template: `
    <!-- Main Content Area (Row) -->
    <div class="flex items-center w-full min-w-0">
      <!-- Avatar Badge -->
      <div
        class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface-container-highest"
      >
        @if (staffImage() && !imageFailed()) {
          <img [src]="staffImage()" (error)="onImageError()" class="w-full h-full object-cover" alt="Staff Member" />
        } @else {
          <div
            class="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-black text-lg"
          >
            {{ staffInitials() }}
          </div>
        }
      </div>

      <!-- Info Column -->
      <div class="grow min-w-0 ml-3 sm:ml-4 flex flex-col gap-0.5">
        <h3 coaster-title class="truncate text-base font-bold text-on-surface">
          {{ staffName() }}
        </h3>
        <p class="text-on-surface-variant text-[0.8rem] font-medium truncate">
          {{ 'common.role.' + roleName().toLowerCase() | translate }}
        </p>
      </div>
    </div>

    <!-- Actions Column / Row -->
    @if (showActions()) {
      <div
        class="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-outline-variant/10 sm:border-t-0 shrink-0"
      >
        @if (!isCurrentUser()) {
          <a
            [attr.href]="disabled() ? null : 'mailto:' + staffEmail()"
            target="_blank"
            rel="noopener noreferrer"
            [class]="
              'w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer shrink-0 ' +
              (disabled()
                ? 'pointer-events-none opacity-50 bg-surface-container-high text-on-surface-variant'
                : 'bg-surface-bright text-primary hover:bg-surface-container-highest')
            "
          >
            <ng-icon name="lucideMail" class="text-lg" />
          </a>
        }

        @if (showDeleteButton()) {
          @if (isCurrentUser()) {
            <button
              [disabled]="disabled() || isOnlyOwner()"
              [title]="isOnlyOwner() ? ('members.leave_tooltip' | translate) : ''"
              class="h-10 px-4 rounded-xl flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 bg-error/10 text-error hover:bg-error/20 font-semibold text-sm shrink-0"
              (click)="onDeleteClick($event)"
            >
              {{ 'members.leave' | translate }}
            </button>
          } @else {
            <button
              [disabled]="disabled()"
              class="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 bg-error/10 text-error hover:bg-error/20 shrink-0"
              (click)="onDeleteClick($event)"
            >
              <ng-icon name="lucideTrash2" class="text-lg" />
            </button>
          }
        }
      </div>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]':
      "'rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center relative overflow-hidden transition-all border border-outline-variant/15 bg-surface-container hover:bg-surface-bright'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly staffEmail = input.required<string>();
  readonly roleName = input.required<string>();
  readonly disabled = input(false);
  readonly showDeleteButton = input(false);
  readonly isCurrentUser = input(false);
  readonly isOnlyOwner = input(false);
  readonly deleteClicked = output<void>();

  readonly imageFailed = linkedSignal(() => {
    this.staffImage(); // establish dependency to reset on change
    return false;
  });

  readonly staffInitials = computed(() => {
    const name = this.staffName() || '';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(name.length, 2)).toUpperCase();
  });

  readonly showActions = computed(() => !this.isCurrentUser() || this.showDeleteButton());

  onImageError(): void {
    this.imageFailed.set(true);
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
