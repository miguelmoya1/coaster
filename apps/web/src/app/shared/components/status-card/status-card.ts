import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusLevelColorPipe } from '../../pipes/status-level';

export type StatusLevel = 'none' | 'success' | 'warning' | 'error' | 'primary';

@Component({
  selector: 'coaster-status-card',
  template: `
    @if (status() !== 'none') {
      <div [class]="'absolute top-0 left-0 w-1 h-full ' + (status() | statusLevelColor)"></div>
    }

    <ng-content />
  `,
  host: {
    class: 'bg-surface-container-high p-6 flex flex-col justify-between rounded-xl relative overflow-hidden',
  },
  imports: [StatusLevelColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard {
  readonly status = input<StatusLevel>('none');
}
