import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

@Component({
  selector: 'coaster-section-title',
  template: `
    <div [class]="wrapperClasses()">
      @if (isH1()) {
        <h1 [class]="titleClasses()">{{ heading() }}</h1>
      } @else {
        <h2 [class]="titleClasses()">{{ heading() }}</h2>
      }
      
      @if (description()) {
        <p class="text-on-surface-variant text-sm">{{ description() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionTitle {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly isH1 = input(false);
  readonly centered = input(false);

  protected wrapperClasses = computed(() => {
    let base = 'flex flex-col gap-2';
    if (this.centered()) {
      base += ' items-center text-center';
    }
    return base;
  });

  protected titleClasses = computed(() => {
    let base = 'font-black text-primary uppercase tracking-wider';
    
    if (this.isH1()) {
      base += ' text-3xl';
    } else {
      base += ' text-2xl';
    }

    if (!this.description()) {
      base += ' border-b border-outline-variant pb-2';
    }

    return base;
  });
}
