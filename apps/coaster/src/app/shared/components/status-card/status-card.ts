import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';

export type StatusLevel = 'none' | 'success' | 'warning' | 'error' | 'primary';

@Component({
  selector: 'coaster-status-card',
  template: `
    @if (status() !== 'none') {
      <div
        [class]="'absolute top-0 left-0 w-1 h-full ' + statusColorClass()"
      ></div>
    }

    <ng-content></ng-content>
  `,
  host: {
    class:
      'bg-surface-container-high p-6 flex flex-col justify-between rounded-xl relative overflow-hidden',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard {
  readonly status = input<StatusLevel>('none');

  readonly statusColorClass = computed(() => {
    switch (this.status()) {
      case 'error':
        return 'bg-error';
      case 'warning':
        return 'bg-tertiary';
      case 'success':
        return 'bg-secondary';
      case 'primary':
        return 'bg-primary';
      default:
        return '';
    }
  });
}
