import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-loading',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideLoaderCircle })],
  template: `
    <div class="flex flex-col items-center justify-center gap-4 w-full h-full p-8" [class]="containerClasses()">
      <ng-icon name="lucideLoaderCircle" [class]="iconClasses()" class="animate-spin" />
      @if (text()) {
        <p [class]="textClasses()">
          {{ text() }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loading {
  public readonly text = input<string>();
  public readonly containerClasses = input<string>('min-h-[200px]');
  public readonly iconClasses = input<string>('text-4xl text-primary');
  public readonly textClasses = input<string>(
    'text-on-surface-variant font-medium tracking-wide animate-pulse uppercase text-sm',
  );
}
