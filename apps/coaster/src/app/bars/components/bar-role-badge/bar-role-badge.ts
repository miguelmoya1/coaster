import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BarRole } from '@coaster/interfaces';

@Component({
  selector: 'coaster-bar-role-badge',
  imports: [TranslatePipe],
  template: `
    <div class="flex items-center gap-2 mt-2">
      <div
        class="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-90"
        [class]="dotColorClass()"
      ></div>
      <span
        class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold"
      >
        {{ labelKey() | translate }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarRoleBadge {
  readonly role = input<BarRole | undefined>(undefined);

  readonly dotColorClass = computed(() => {
    switch (this.role()) {
      case BarRole.OWNER:
        return 'bg-primary text-primary';
      case BarRole.STAFF:
        return 'bg-orange-500 text-orange-500';
      default:
        return 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)] text-primary'; 
    }
  });

  readonly labelKey = computed(() => {
    switch (this.role()) {
      case BarRole.OWNER:
        return 'bars.role.owner';
      case BarRole.STAFF:
        return 'bars.role.staff';
      default:
        return 'bars.select.operational';
    }
  });
}
