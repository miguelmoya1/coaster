import { Directive, ElementRef, inject } from '@angular/core';

const H1_CLASSES = 'font-black text-primary text-3xl tracking-tighter md:text-4xl';
const H2_CLASSES = 'font-black text-on-surface text-2xl tracking-tight md:text-3xl';
const H3_CLASSES = 'font-bold text-on-surface text-xl md:text-2xl';
const H4_CLASSES = 'font-bold text-on-surface text-lg leading-snug';
const H5_CLASSES = 'font-semibold text-on-surface-variant text-base';
const H6_CLASSES = 'font-medium text-on-surface-variant text-sm uppercase tracking-wide';

@Directive({
  selector:
    // eslint-disable-next-line @angular-eslint/directive-selector
    'h1[coaster-title], h2[coaster-title], h3[coaster-title], h4[coaster-title], h5[coaster-title], h6[coaster-title]',
  host: {
    '[class]': 'hostClasses',
  },
})
export class CoasterTitle {
  readonly hostClasses: string;

  constructor() {
    const tag = inject(ElementRef).nativeElement.tagName.toLowerCase();
    switch (tag) {
      case 'h1':
        this.hostClasses = H1_CLASSES;
        break;
      case 'h3':
        this.hostClasses = H3_CLASSES;
        break;
      case 'h4':
        this.hostClasses = H4_CLASSES;
        break;
      case 'h5':
        this.hostClasses = H5_CLASSES;
        break;
      case 'h6':
        this.hostClasses = H6_CLASSES;
        break;
      case 'h2':
      default:
        this.hostClasses = H2_CLASSES;
        break;
    }
  }
}

const LABEL_CLASSES = 'text-xs font-bold uppercase tracking-wider text-on-surface-variant';

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
