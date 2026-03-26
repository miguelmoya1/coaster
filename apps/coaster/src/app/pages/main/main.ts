import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav, TopAppBar } from '../../shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  template: `
    <coaster-top-app-bar />
    <coaster-bottom-nav />
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export default class Main {}
