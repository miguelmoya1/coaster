import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastContainer } from './shared/components/toast/toast-container';

@Component({
  selector: 'coaster-root',
  imports: [RouterModule, ToastContainer],
  template: `
    <router-outlet />
    <coaster-toast-container />
  `,
})
export class App {
  protected title = 'coaster';
}
