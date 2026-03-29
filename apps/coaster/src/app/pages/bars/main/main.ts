import { Component, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentUser } from '../../../core/services/current-user';
import { BottomNav, TopAppBar } from '../../../shared';

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

    <coaster-bottom-nav [barId]="barId()" />
  `,
})
export default class Main {
  public readonly barId = input.required<string>();
  public readonly currentUser = inject(CurrentUser).current;
}
