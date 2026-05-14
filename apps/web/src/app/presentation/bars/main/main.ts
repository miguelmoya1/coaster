import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarId } from '@coaster/common';
import { BarsStore } from '../../../bars';
import { CurrentUser, Socket } from '../../../core';
import { MembersStore } from '../../../members';
import { BottomNav, TopAppBar } from '../../../shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  templateUrl: './main.html',
  host: {
    class: 'min-h-screen flex flex-col items-center',
  },
})
export default class Main {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #barsStore = inject(BarsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #socketService = inject(Socket);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentBar = this.#barsStore.current;

  protected readonly isOwner = computed(() => {
    if (!this.#membersStore.list.hasValue() || !this.#currentUser.current.hasValue()) {
      return false;
    }

    const members = this.#membersStore.list.value();
    if (!members) {
      return false;
    }

    const userId = this.#currentUser.current.value().id;

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
      this.#barsStore.setBarId(barId);
      this.#socketService.joinBar(barId);
      this.#membersStore.setBarId(barId);

      cleanup(() => {
        this.#barsStore.setBarId(undefined);
        this.#socketService.leaveBar(barId);
        this.#membersStore.setBarId(undefined);
      });
    });
  }
}
