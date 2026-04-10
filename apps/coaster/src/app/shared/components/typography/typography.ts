import { Directive } from '@angular/core';

const TITLE_CLASSES = 'font-black text-on-surface text-2xl tracking-tight';
const LABEL_CLASSES = 'text-xs font-bold uppercase tracking-wider text-on-surface-variant';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'h1[coaster-title], h2[coaster-title]',
  host: {
    '[class]': 'hostClasses',
  },
})
export class CoasterTitle {
  readonly hostClasses = TITLE_CLASSES;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'label[coaster-label]',
  host: {
    '[class]': 'hostClasses',
  },
})
export class CoasterLabel {
  readonly hostClasses = LABEL_CLASSES;
}
