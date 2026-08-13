import { Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'coaster-spinner',
  imports: [MatProgressSpinner],
  template: `<mat-progress-spinner mode="indeterminate" [diameter]="diameter()" [strokeWidth]="2" />`,
  host: {
    class: 'inline-flex items-center justify-center shrink-0',
    role: 'status',
    '[style.width.px]': 'diameter()',
    '[style.height.px]': 'diameter()',
  },
  styles: [
    `
      :host ::ng-deep .mdc-circular-progress {
        display: block;
      }

      :host ::ng-deep circle {
        stroke: currentColor;
      }
    `,
  ],
})
export class Spinner {
  public readonly diameter = input(18);
}
