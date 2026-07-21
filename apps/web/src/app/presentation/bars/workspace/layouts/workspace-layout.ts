import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentBarStore, MyMemberStore } from '@coaster/bars';
import type { BarId } from '@coaster/common';
import { CurrentUser, Socket } from '@coaster/core';
import { MembersStore } from '@coaster/members';
import { BottomNav } from '../components/bottom-nav/bottom-nav';
import { TopAppBar } from '../components/top-app-bar/top-app-bar';
import { AiVoiceButton } from '../components/ai-voice-button/ai-voice-button';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav, AiVoiceButton],
  template: `
    @if (currentUser.hasValue()) {
      <coaster-top-app-bar [label]="titleToShow()" [image]="photoUrlToShow()" />
    }

    <main class="w-full max-w-xl flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-28 hide-scrollbar">
      <router-outlet />
    </main>

    <coaster-bottom-nav [barId]="barId()" />
    <coaster-ai-voice-button [barId]="barId()" />
  `,
  host: {
    class: 'h-svh w-full flex flex-col items-center overflow-hidden relative',
  },
})
export default class WorkspaceLayout {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentBarStore = inject(CurrentBarStore);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #membersStore = inject(MembersStore);
  readonly #socketService = inject(Socket);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentBar = this.#currentBarStore.current;

  protected readonly isOwner = this.#myMemberStore.isOwner;

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
      this.#currentBarStore.setBarId(barId);
      this.#socketService.joinBar(barId);
      this.#membersStore.setBarId(barId);

      cleanup(() => {
        this.#currentBarStore.setBarId(undefined);
        this.#socketService.leaveBar(barId);
        this.#membersStore.setBarId(undefined);
      });
    });
  }
}
