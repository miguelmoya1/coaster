import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'coaster-root',
  imports: [RouterModule],
  template: ` <router-outlet /> `,
})
export class App {
  protected title = 'coaster';
}
