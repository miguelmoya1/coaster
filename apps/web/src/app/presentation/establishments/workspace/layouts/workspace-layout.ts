import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CurrentEstablishmentStore, ModulesStore } from '@coaster/establishments';
import { OnboardingDialog } from '../components/onboarding/onboarding-dialog';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import type { EstablishmentId } from '@coaster/common';
import { CurrentUser, Socket } from '@coaster/core';
import { MembersStore, MyMemberStore } from '@coaster/establishment-members';
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
        <coaster-top-app-bar [establishmentId]="establishmentId()" [label]="titleToShow()" [image]="photoUrlToShow()" />
      }

      <coaster-subscription-banner [establishmentId]="establishmentId()" />

      <main class="w-full flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col" [class]="mainPaddingClass()">
        <router-outlet />
      </main>

      <coaster-bottom-nav [establishmentId]="establishmentId()" />
    </div>

    <coaster-ai-assistant-panel [establishmentId]="establishmentId()" />
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
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #currentUser = inject(CurrentUser);
  readonly #currentEstablishmentStore = inject(CurrentEstablishmentStore);
  readonly #modulesStore = inject(ModulesStore);
  readonly #dialog = inject(MatDialog);
  #onboardingShown = false;
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #membersStore = inject(MembersStore);
  readonly #establishmentSubscriptionStore = inject(EstablishmentSubscriptionStore);
  readonly #socketService = inject(Socket);
  readonly #aiVoiceService = inject(AiVoiceService);

  protected readonly currentUser = this.#currentUser.current;
  protected readonly currentEstablishment = this.#currentEstablishmentStore.current;

  protected readonly isOwner = this.#myMemberStore.isOwner;

  /**
   * The mobile sheet rests above the bottom nav, so the content needs to clear both of them or the
   * last row of cards hides behind the composer.
   */
  protected readonly mainPaddingClass = computed(() =>
    this.#aiVoiceService.isOpen() && this.#aiVoiceService.snap() === 'peek' ? 'pb-[13rem] lg:pb-28' : 'pb-28',
  );

  protected readonly titleToShow = computed(() => {
    if (!this.currentEstablishment.hasValue() || !this.currentUser.hasValue()) {
      return '';
    }

    return `${this.currentUser.value().name} (${this.currentEstablishment.value().name})`;
  });

  protected readonly photoUrlToShow = computed(() => {
    if (!this.currentUser.hasValue()) {
      return '';
    }

    return this.currentUser.value().photoUrl;
  });

  constructor() {
    /*
     * Only an owner can answer these questions, and only once: a brand new establishment has no
     * configuredAt until somebody does. Everything backfilled from before this existed counts as
     * configured, so no working venue is ever interrupted by it.
     */
    effect(() => {
      const isConfigured = this.#modulesStore.isConfigured();
      const establishment = this.currentEstablishment.hasValue() ? this.currentEstablishment.value() : undefined;

      if (isConfigured !== false || !establishment || !this.isOwner() || this.#onboardingShown) {
        return;
      }

      this.#onboardingShown = true;

      untracked(() =>
        this.#dialog.open(OnboardingDialog, {
          data: { establishmentId: establishment.id, establishmentName: establishment.name },
          disableClose: true,
          width: '32rem',
          maxWidth: '92vw',
        }),
      );
    });

    effect((cleanup) => {
      const establishmentId = this.establishmentId();
      this.#currentEstablishmentStore.setEstablishmentId(establishmentId);
      this.#modulesStore.setEstablishmentId(establishmentId);
      this.#socketService.joinEstablishment(establishmentId);
      this.#membersStore.setEstablishmentId(establishmentId);
      this.#myMemberStore.setEstablishmentId(establishmentId);
      this.#establishmentSubscriptionStore.setEstablishmentId(establishmentId);

      cleanup(() => {
        this.#currentEstablishmentStore.setEstablishmentId(undefined);
        this.#modulesStore.setEstablishmentId(undefined);
        this.#socketService.leaveEstablishment(establishmentId);
        this.#membersStore.setEstablishmentId(undefined);
        this.#myMemberStore.setEstablishmentId(undefined);
        this.#establishmentSubscriptionStore.setEstablishmentId(undefined);
      });
    });
  }
}
