import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'coaster-bars-layout',
  imports: [RouterOutlet],
  template: `
    <main class="w-full flex-1 flex flex-col py-6 sm:py-12">
      <router-outlet />
    </main>
  `,
  host: {
    class: 'min-h-screen w-full flex flex-col bg-background',
  },
})
export default class BarsLayout {}
