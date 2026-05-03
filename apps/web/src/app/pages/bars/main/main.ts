import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarId } from '@coaster/common';
import { CurrentBar } from '../../../bars';
import { CurrentUser } from '../../../core';
import { BarMembers } from '../../../members';
import { BottomNav, TopAppBar } from '../../../shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  template: `
    @if (currentUser.hasValue()) {
      <coaster-top-app-bar [label]="titleToShow()" [image]="photoUrlToShow()" />
    }

    <main class="py-20 px-4">
      <router-outlet />
    </main>

    <coaster-bottom-nav [barId]="barId()" [isOwner]="isOwner()" />
  `,
})
export default class Main {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentBar = inject(CurrentBar);
  readonly #barMembers = inject(BarMembers);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentBar = this.#currentBar.current;

  protected readonly isOwner = computed(() => {
    if (!this.#barMembers.list.hasValue() || !this.#currentUser.current.hasValue()) {
      return false;
    }

    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  protected readonly titleToShow = computed(() => {
    if (!this.currentBar.hasValue() || !this.currentUser.hasValue()) {
      return '';
    }

    return `${this.currentUser.value().name} (${this.currentBar.value().name})`;
  });

  protected readonly photoUrlToShow = computed(() => {
    if (!this.currentUser.hasValue()) {
      return '';
    }

    return this.currentUser.value().photoUrl;
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#currentBar.setBarContext(barId);
      this.#barMembers.setBarContext(barId);
    });
  }
}
