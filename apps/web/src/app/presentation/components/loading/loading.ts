import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'coaster-loading',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-4 w-full h-full p-8" [class]="containerClasses()">
      <mat-spinner diameter="40" />
      @if (text()) {
        <p [class]="textClasses()">
          {{ text() }}
        </p>
      }
    </div>
  `,
  })
export class Loading {
  public readonly text = input<string>();
  public readonly containerClasses = input<string>('min-h-[200px]');
  public readonly textClasses = input<string>(
    'text-on-surface-variant font-medium tracking-wide animate-pulse uppercase text-sm',
  );
}
