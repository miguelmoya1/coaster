import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'coaster-roster',
  imports: [],
  template: ` <p>roster works!</p> `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Roster {}
