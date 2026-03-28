import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'coaster-bars-layout',
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface flex flex-col items-center p-4 py-12 md:p-8">
      <div class="w-full max-w-lg mt-12 md:mt-24">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BarsLayout {}
