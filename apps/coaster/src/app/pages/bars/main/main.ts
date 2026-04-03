import { Component, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarId } from '@coaster/interfaces';
import { CurrentBar } from '../../../bars';
import { CurrentUser } from '../../../core';
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

    <main class="py-20 px-4">
      <router-outlet />
    </main>

    <coaster-bottom-nav [barId]="barId()" />
  `,
})
export default class Main {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentBar = inject(CurrentBar);

  protected readonly currentUser = this.#currentUser.current;

  constructor() {
    effect((cleanup) => {
      const barId = this.barId();
      this.#currentBar.select(barId);

      cleanup(() => {
        this.#currentBar.clear();
      });
    });
  }
}
