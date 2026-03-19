import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'coaster-horizontal-date-scroller',
  template: `<p>horizontal-date-scroller works!</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HorizontalDateScrollerComponent {}
