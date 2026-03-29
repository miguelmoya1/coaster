import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'coaster-pantry',
  imports: [],
  template: `<p>pantry works!</p>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class Pantry {}
