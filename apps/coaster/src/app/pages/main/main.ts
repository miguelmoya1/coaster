import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet],
  template: `
    hola
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export default class Main {}
