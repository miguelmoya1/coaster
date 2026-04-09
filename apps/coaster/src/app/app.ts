import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'coaster-root',
  template: `
    <router-outlet />
  `,
})
export class App {
  protected title = 'coaster';
}
