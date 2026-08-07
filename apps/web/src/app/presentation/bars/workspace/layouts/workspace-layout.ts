import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentBarStore } from '@coaster/bars';
import { BarSubscriptionStore } from '@coaster/bar-subscription';
import type { BarId } from '@coaster/common';
import { CurrentUser, Socket } from '@coaster/core';
import { MembersStore, MyMemberStore } from '@coaster/bar-members';
import { AiAssistantPanel } from '../components/ai-assistant/ai-assistant-panel';
import { AiVoiceService } from '../components/ai-assistant/ai-voice.service';
import { BottomNav } from '../components/bottom-nav/bottom-nav';
import { SubscriptionBanner } from '../components/subscription-banner/subscription-banner';
import { TopAppBar } from '../components/top-app-bar/top-app-bar';

@Component({
  selector: 'coaster-main',
  imports: [RouterOutlet, TopAppBar, BottomNav, AiAssistantPanel, SubscriptionBanner],
  template: `
    <div class="content-column relative flex min-w-0 flex-1 flex-col overflow-hidden">
      @if (currentUser.hasValue()) {
        <coaster-top-app-bar [barId]="barId()" [label]="titleToShow()" [image]="photoUrlToShow()" />
      }

      <coaster-subscription-banner [barId]="barId()" />

      <main class="w-full flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col" [class]="mainPaddingClass()">
        <router-outlet />
      </main>

      <coaster-bottom-nav [barId]="barId()" />
    </div>

    <coaster-ai-assistant-panel [barId]="barId()" />
  `,
  styles: [
    `
      /*
       * Layout containment makes this element the containing block for its fixed-position
       * descendants, so the bottom nav, the FAB and the order bulk actions re-centre inside the
       * content column instead of the viewport once the assistant rail claims its width.
       */
      .content-column {
        contain: layout;
      }
    `,
  ],
  host: {
    class: 'h-svh w-full flex overflow-hidden relative bg-background',
  },
})
export default class WorkspaceLayout {
  public readonly barId = input.required<BarId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentBarStore = inject(CurrentBarStore);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #membersStore = inject(MembersStore);
  readonly #barSubscriptionStore = inject(BarSubscriptionStore);
  readonly #socketService = inject(Socket);
  readonly #aiVoiceService = inject(AiVoiceService);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentBar = this.#currentBarStore.current;

  protected readonly isOwner = this.#myMemberStore.isOwner;

  /**
   * The mobile sheet rests above the bottom nav, so the content needs to clear both of them or the
   * last row of cards hides behind the composer.
   */
  protected readonly mainPaddingClass = computed(() =>
    this.#aiVoiceService.isOpen() && this.#aiVoiceService.snap() === 'peek' ? 'pb-[13rem] lg:pb-28' : 'pb-28',
  );

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
      this.#myMemberStore.setBarId(barId);
      this.#barSubscriptionStore.setBarId(barId);

      cleanup(() => {
        this.#currentBarStore.setBarId(undefined);
        this.#socketService.leaveBar(barId);
        this.#membersStore.setBarId(undefined);
        this.#myMemberStore.setBarId(undefined);
        this.#barSubscriptionStore.setBarId(undefined);
      });
    });
  }
}
