import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentUser } from '../../core/services/current-user';
import { BottomNav, TopAppBar } from '../../shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  template: `
    @if (currentUser.hasValue()) {
      <coaster-top-app-bar
        [label]="currentUser.value()!.name"
        [image]="currentUser.value()!.photoUrl!"
      />
    }

    <main class="py-18">
      <router-outlet />
    </main>

    <coaster-bottom-nav />
  `,
})
export default class Main {
  readonly currentUser = inject(CurrentUser).current;
}
