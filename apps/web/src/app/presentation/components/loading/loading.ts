import { Component, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'coaster-loading',
  imports: [MatProgressBar],
  template: `
    <div class="w-full flex flex-col gap-3" [class]="containerClasses()">
      <mat-progress-bar mode="indeterminate" />

      @if (text()) {
        <p [class]="textClasses()">{{ text() }}</p>
      }
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class Loading {
  public readonly text = input<string>();
  public readonly containerClasses = input<string>('');
  public readonly textClasses = input<string>('text-on-surface-variant text-sm');
}
