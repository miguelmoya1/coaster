import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePhone, lucideMessageSquare } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-staff-member-card',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucidePhone, lucideMessageSquare })],
  template: `
    <div [class]="'absolute left-0 top-0 bottom-0 w-1 ' + (isOffDuty() ? 'bg-outline-variant' : 'bg-primary')"></div>
    
    <div [class]="'w-16 h-16 rounded-xl overflow-hidden shrink-0 ' + (isOffDuty() ? 'grayscale' : '')">
      <img [src]="staffImage()" class="w-full h-full object-cover" alt="Staff Member" />
    </div>
    
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-lg tracking-tight truncate">{{ staffName() }}</h3>
        @if (!isOffDuty()) {
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        }
      </div>
      <p class="text-on-surface-variant body-md">{{ roleName() }}</p>
      <div class="mt-2 flex items-center gap-2">
        @if (isOffDuty()) {
          <span class="bg-surface-container-highest px-2 py-0.5 rounded text-xxs font-bold text-on-surface-variant uppercase tracking-widest">Off Duty</span>
        } @else {
          <span class="bg-surface-container-highest px-2 py-0.5 rounded text-xxs font-bold text-primary uppercase tracking-widest">On Duty</span>
        }
      </div>
    </div>
    
    <div class="flex gap-2">
      <button [disabled]="disabled()" [class]="'w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ' + (isOffDuty() ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-bright text-primary hover:bg-surface-container-highest')">
        <ng-icon name="lucidePhone" class="text-xl"></ng-icon>
      </button>
      <button [disabled]="disabled()" [class]="'w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ' + (isOffDuty() ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-bright text-primary hover:bg-surface-container-highest')">
        <ng-icon name="lucideMessageSquare" class="text-xl"></ng-icon>
      </button>
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]': "'rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden block ' + (isOffDuty() ? 'bg-surface-container-low opacity-60' : 'bg-surface-container')"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffMemberCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly roleName = input.required<string>();
  readonly isOffDuty = input(false);
  readonly disabled = input(false);
}
