import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input } from '@angular/core';

@Component({
  selector: 'coaster-status-card',
  template: `<p>status-card works!</p>\n  <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class StatusCardComponent {
  @Input() statusLevel: string = 'info';
}
