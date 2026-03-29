import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'coaster-staff',
  imports: [],
  template: `<p>staff works!</p>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {}
