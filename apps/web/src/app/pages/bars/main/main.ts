import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarId } from '@coaster/common';
import { CurrentBar } from '../../../bars';
import { CurrentUser, Socket } from '../../../core';
import { BarMembers } from '../../../members';
import { BottomNav, TopAppBar } from '../../../shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  templateUrl: './main.html',
})
export default class Main {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentBar = inject(CurrentBar);
  readonly #barMembers = inject(BarMembers);
  readonly #socketService = inject(Socket);

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
    effect((cleanup) => {
      const barId = this.barId();
      this.#currentBar.setBarContext(barId);
      this.#socketService.joinBar(barId);

      cleanup(() => {
        this.#currentBar.setBarContext(undefined);
        this.#socketService.leaveBar(barId);
      });
    });
  }
}
