import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'coaster-bars-layout',
  imports: [RouterOutlet],
  template: `
    <main class="w-full max-w-xl mt-12 md:mt-24">
      <router-outlet />
    </main>
  `,
  host: {
    class: 'min-h-screen flex flex-col items-center',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BarsLayout {}
