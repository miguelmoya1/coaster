import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { BarId } from '@coaster/common';
import { CurrentUser, Socket } from '@coaster/core';
import { MembersStore } from '@coaster/members';
import { BottomNav, TopAppBar } from '@coaster/shared';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  template: `
    @if (currentUser.hasValue()) {
      <coaster-top-app-bar [label]="titleToShow()" [image]="photoUrlToShow()" />
    }

    <main class="w-full max-w-xl flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-28 hide-scrollbar">
      <router-outlet />
    </main>

    <coaster-bottom-nav [barId]="barId()" [isOwner]="isOwner()" />
  `,
  host: {
    class: 'h-svh w-full flex flex-col items-center overflow-hidden relative',
  },
})
export default class WorkspaceLayout {
  public readonly barId = input.required<BarId>();
  
  readonly #currentUser = inject(CurrentUser);
  readonly #barsStore = inject(BarsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #socketService = inject(Socket);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentBar = this.#barsStore.current;

  protected readonly isOwner = this.#barsStore.isOwner;

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
