import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentBarStore } from '@coaster/bars';
import { MyMemberStore } from '@coaster/bar-members';
import type { BarId } from '@coaster/common';
import { CurrentUser, Socket } from '@coaster/core';
import { MembersStore } from '@coaster/bar-members';
import { AiVoiceButton } from '../components/ai-voice-button/ai-voice-button';
import { BottomNav } from '../components/bottom-nav/bottom-nav';
import { SubscriptionBanner } from '../components/subscription-banner/subscription-banner';
import { TopAppBar } from '../components/top-app-bar/top-app-bar';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav, AiVoiceButton, SubscriptionBanner],
  template: `
    @if (currentUser.hasValue()) {
      <coaster-top-app-bar [barId]="barId()" [label]="titleToShow()" [image]="photoUrlToShow()" />
    }

    <coaster-subscription-banner [barId]="barId()" />

    <main class="w-full flex-1 min-h-0 overflow-y-auto pb-28 hide-scrollbar flex flex-col">
      <router-outlet />
    </main>

    <coaster-bottom-nav [barId]="barId()" />
    <coaster-ai-voice-button [barId]="barId()" />
  `,
  host: {
    class: 'h-svh w-full flex flex-col overflow-hidden relative bg-background',
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
