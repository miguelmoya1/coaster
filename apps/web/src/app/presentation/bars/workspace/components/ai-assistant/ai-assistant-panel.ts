import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatFormField, MatHint, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type { BarId } from '@coaster/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AiVoiceService, type AiSheetSnap } from './ai-voice.service';
import { MarkdownMessage } from './markdown-message';

const SUGGESTION_KEYS = ['takings', 'low_stock', 'rota', 'order'] as const;

/** The rail takes real estate from the content, so it only appears where there is room to spare. */
const RAIL_BREAKPOINT = '(min-width: 1024px)';

/** Sheet heights in viewport units. `peek` is content-sized, hence absent. */
const SNAP_HEIGHTS: Record<Exclude<AiSheetSnap, 'peek'>, string> = {
  half: '55svh',
  full: 'calc(100svh - 12rem)',
};

@Component({
  selector: 'coaster-ai-assistant-panel',
  imports: [
    MatIconButton,
    MatIcon,
    MatFormField,
    MatInput,
    MatPrefix,
    MatSuffix,
    MatHint,
    CdkTextareaAutosize,
    MarkdownMessage,
    TranslatePipe,
  ],
  template: `
    @if (service.isOpen()) {
      <aside
        [class]="shellClass()"
        [style.height]="sheetHeight()"
        role="complementary"
        [attr.aria-label]="'ai_voice.title' | translate"
      >
        @if (!isRail()) {
          <button
            type="button"
            class="group flex w-full shrink-0 cursor-pointer justify-center py-2 outline-none"
            (click)="service.cycleSnap()"
            (pointerdown)="startDrag($event)"
            [attr.aria-label]="'ai_voice.resize' | translate"
            [title]="'ai_voice.resize' | translate"
          >
            <span class="h-1 w-10 rounded-full bg-outline-variant transition-colors group-hover:bg-primary/60"></span>
          </button>
        }

        <header
          class="flex items-start justify-between gap-2 border-b border-outline-variant/20 px-4 pb-3"
          [class.pt-4]="isRail()"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <mat-icon class="text-xl!">auto_awesome</mat-icon>
            </div>

            <div class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-bold tracking-tight">{{ 'ai_voice.title' | translate }}</span>
              <span class="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span class="relative flex h-2 w-2 shrink-0">
                  @if (service.status() === 'listening') {
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75">
                    </span>
                  }
                  @if (service.status() === 'processing') {
                    <span class="absolute inline-flex h-full w-full animate-pulse rounded-full bg-primary opacity-75">
                    </span>
                  }
                  <span class="relative inline-flex h-2 w-2 rounded-full" [class]="statusDotClass()"></span>
                </span>
                {{ 'ai_voice.status.' + service.status() | translate }}
              </span>
            </div>
          </div>

          <div class="flex shrink-0 items-center">
            <button
              mat-icon-button
              (click)="service.resetChat()"
              [disabled]="service.messages().length === 0"
              [title]="'ai_voice.reset_chat' | translate"
              [attr.aria-label]="'ai_voice.reset_chat' | translate"
            >
              <mat-icon class="text-on-surface-variant! text-lg!">delete_sweep</mat-icon>
            </button>
            <button
              mat-icon-button
              (click)="service.toggleMute()"
              [title]="'ai_voice.toggle_mic' | translate"
              [attr.aria-label]="'ai_voice.toggle_mic' | translate"
            >
              <mat-icon class="text-on-surface-variant! text-lg!">
                {{ service.isMuted() ? 'volume_off' : 'volume_up' }}
              </mat-icon>
            </button>
            <button
              mat-icon-button
              (click)="service.close()"
              [title]="'ai_voice.tooltip_close' | translate"
              [attr.aria-label]="'ai_voice.tooltip_close' | translate"
            >
              <mat-icon class="text-on-surface-variant! text-lg!">close</mat-icon>
            </button>
          </div>
        </header>

        @if (!isPeek()) {
          <div #chatContainer class="hide-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            @if (service.messages().length === 0) {
              <div class="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
                <mat-icon class="text-5xl! h-12! w-12! text-on-surface-variant/30">forum</mat-icon>
                <p class="max-w-[16rem] text-sm text-on-surface-variant">{{ 'ai_voice.empty_chat' | translate }}</p>

                <div class="flex flex-wrap justify-center gap-2 pt-1">
                  @for (suggestion of suggestions(); track suggestion) {
                    <button
                      type="button"
                      (click)="sendSuggestion(suggestion)"
                      class="rounded-full border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {{ suggestion }}
                    </button>
                  }
                </div>
              </div>
            } @else {
              @for (msg of service.messages(); track $index) {
                <div class="flex flex-col gap-1" [class]="msg.role === 'user' ? 'items-end' : 'items-start'">
                  <span class="px-2 text-xxs font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    {{ (msg.role === 'user' ? 'ai_voice.user' : 'ai_voice.assistant') | translate }}
                  </span>
                  <div
                    class="max-w-[85%] rounded-2xl border px-3.5 py-2 text-sm leading-relaxed"
                    [class]="
                      msg.role === 'user'
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-surface-container border-outline-variant/25 text-on-surface'
                    "
                  >
                    <div class="flex items-start justify-between gap-3">
                      @if (msg.role === 'assistant') {
                        <coaster-markdown-message class="min-w-0 flex-1" [content]="msg.content" />
                      } @else {
                        <p class="whitespace-pre-line">{{ msg.content }}</p>
                      }
                      @if (msg.role === 'assistant') {
                        <button
                          mat-icon-button
                          (click)="service.speak(msg.content)"
                          [title]="'ai_voice.speak_message' | translate"
                          [attr.aria-label]="'ai_voice.speak_message' | translate"
                          class="-mr-1 mt-0.5 h-5! w-5! min-w-5! p-0! opacity-60 transition-opacity hover:opacity-100"
                        >
                          <mat-icon class="text-on-surface-variant! text-sm! h-3.5! w-3.5!">volume_up</mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (service.status() === 'processing' && service.streamingText()) {
                <div class="flex flex-col items-start gap-1">
                  <span class="px-2 text-xxs font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    {{ 'ai_voice.assistant' | translate }}
                  </span>
                  <div
                    class="max-w-[85%] rounded-2xl border border-outline-variant/25 bg-surface-container px-3.5 py-2 text-sm leading-relaxed text-on-surface"
                  >
                    <coaster-markdown-message [content]="service.streamingText()" />
                  </div>
                </div>
              }
            }
          </div>
        }

        @if (service.error()) {
          <div class="mx-4 mb-3 flex flex-col gap-1 rounded-xl border border-error/25 bg-error/10 p-3 text-error">
            <span class="text-xxs font-bold uppercase tracking-wider opacity-80">
              {{ 'ai_voice.error' | translate }}
            </span>
            <p class="text-xs leading-normal">{{ service.error() }}</p>
          </div>
        }

        <form
          class="shrink-0 border-t border-outline-variant/20 px-4 pt-3"
          [class]="isRail() ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]' : 'pb-3'"
          (submit)="submitDraft($event)"
        >
          @if (isListening()) {
            <div class="mb-1 flex items-center justify-center gap-1" aria-hidden="true">
              <span class="wave-bar bar-1"></span>
              <span class="wave-bar bar-2"></span>
              <span class="wave-bar bar-3"></span>
              <span class="wave-bar bar-4"></span>
              <span class="wave-bar bar-5"></span>
            </div>
          }

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
            @if (service.isSupported()) {
              <button
                matPrefix
                mat-icon-button
                type="button"
                (click)="toggleListening()"
                [title]="(isListening() ? 'ai_voice.stop_listening' : 'ai_voice.speak_again') | translate"
                [attr.aria-label]="(isListening() ? 'ai_voice.stop_listening' : 'ai_voice.speak_again') | translate"
                [class.text-primary!]="isListening()"
              >
                <mat-icon>{{ isListening() ? 'stop' : 'mic' }}</mat-icon>
              </button>
            }

            <textarea
              matInput
              cdkTextareaAutosize
              cdkAutosizeMinRows="1"
              cdkAutosizeMaxRows="6"
              name="draft"
              autocomplete="off"
              class="resize-none"
              [value]="draft()"
              (input)="onDraftInput($event)"
              (keydown)="onComposerKeydown($event)"
              [disabled]="service.status() === 'processing'"
              [placeholder]="
                (isListening() ? 'ai_voice.placeholder_listening' : 'ai_voice.type_placeholder') | translate
              "
            ></textarea>

            <button
              matSuffix
              mat-icon-button
              type="submit"
              [disabled]="!draft().trim() || service.status() === 'processing'"
              [title]="'ai_voice.send' | translate"
              [attr.aria-label]="'ai_voice.send' | translate"
              class="text-primary!"
            >
              @if (service.status() === 'processing') {
                <mat-icon class="animate-spin">progress_activity</mat-icon>
              } @else {
                <mat-icon>send</mat-icon>
              }
            </button>

            @if (!service.isSupported()) {
              <mat-hint>{{ 'ai_voice.voice_unavailable' | translate }}</mat-hint>
            }
          </mat-form-field>
        </form>
      </aside>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .ai-rail {
        animation: ai-rail-in 220ms cubic-bezier(0.32, 0.72, 0, 1);
      }

      .ai-sheet {
        animation: ai-sheet-in 220ms cubic-bezier(0.32, 0.72, 0, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        .ai-rail,
        .ai-sheet {
          animation: none;
        }
      }

      @keyframes ai-rail-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes ai-sheet-in {
        from {
          transform: translateY(110%);
        }
        to {
          transform: translateY(0);
        }
      }

      .wave-bar {
        display: inline-block;
        width: 3px;
        height: 12px;
        background-color: var(--color-primary);
        border-radius: 2px;
        animation: soundwave 1s ease-in-out infinite alternate;
      }
      .bar-1 {
        animation-delay: 0.1s;
        height: 8px;
      }
      .bar-2 {
        animation-delay: 0.3s;
        height: 14px;
      }
      .bar-3 {
        animation-delay: 0.5s;
        height: 10px;
      }
      .bar-4 {
        animation-delay: 0.2s;
        height: 16px;
      }
      .bar-5 {
        animation-delay: 0.4s;
        height: 11px;
      }

      @keyframes soundwave {
        0% {
          transform: scaleY(0.4);
        }
        100% {
          transform: scaleY(1.4);
        }
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'service.isOpen() && service.close()',
  },
})
export class AiAssistantPanel {
  public readonly barId = input.required<BarId>();

  readonly service = inject(AiVoiceService);
  readonly #translate = inject(TranslateService);
  readonly #breakpoints = inject(BreakpointObserver);

  /** True where the assistant docks beside the content instead of floating over it. */
  protected readonly isRail = toSignal(this.#breakpoints.observe(RAIL_BREAKPOINT).pipe(map((state) => state.matches)), {
    initialValue: this.#breakpoints.isMatched(RAIL_BREAKPOINT),
  });

  protected readonly isPeek = computed(() => !this.isRail() && this.service.snap() === 'peek');

  protected readonly draft = signal('');
  protected readonly chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  /** Live height while a drag is in flight; null hands control back to the current snap. */
  readonly #dragHeight = signal<number | null>(null);

  protected readonly shellClass = computed(() =>
    this.isRail()
      ? 'ai-rail relative flex h-full w-[26rem] shrink-0 flex-col border-l border-outline-variant/30 bg-surface-container-low text-on-surface'
      : 'ai-sheet fixed left-4 right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 flex flex-col overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-elevated',
  );

  protected readonly sheetHeight = computed(() => {
    if (this.isRail()) {
      return null;
    }

    const dragging = this.#dragHeight();
    if (dragging !== null) {
      return `${dragging}px`;
    }

    const snap = this.service.snap();
    return snap === 'peek' ? null : SNAP_HEIGHTS[snap];
  });

  protected readonly isListening = computed(
    () => this.service.status() === 'listening' || this.service.status() === 'paused',
  );

  /** Example prompts for the empty state, re-resolved whenever the user switches language. */
  protected readonly suggestions = computed(() => {
    this.#translate.currentLang();

    return SUGGESTION_KEYS.map((key) => this.#translate.instant(`ai_voice.suggestions.${key}`) as string);
  });

  protected readonly statusDotClass = computed(() => {
    switch (this.service.status()) {
      case 'listening':
        return 'bg-success';
      case 'paused':
        return 'bg-secondary';
      case 'processing':
        return 'bg-primary';
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-on-surface-variant/50';
    }
  });

  constructor() {
    // Dictation and typing share one composer, so whatever the mic hears lands in the draft.
    effect(() => {
      const transcript = this.service.transcript();

      if (transcript) {
        this.draft.set(transcript);
      }
    });

    effect(() => {
      const container = this.chatContainer();
      const shouldScroll = this.service.messages().length > 0 || this.service.streamingText().length > 0;

      if (container && shouldScroll) {
        setTimeout(() => {
          const element = container.nativeElement;
          element.scrollTop = element.scrollHeight;
        }, 50);
      }
    });
  }

  /** Drags the sheet with the finger and settles on whichever snap ends up closest. */
  protected startDrag(event: PointerEvent) {
    if (this.isRail()) {
      return;
    }

    const handle = event.target as HTMLElement;
    const sheet = handle.closest('aside');

    if (!sheet) {
      return;
    }

    const startY = event.clientY;
    const startHeight = sheet.getBoundingClientRect().height;
    let moved = false;

    const onMove = (move: PointerEvent) => {
      const height = startHeight + (startY - move.clientY);
      moved = moved || Math.abs(startY - move.clientY) > 4;
      this.#dragHeight.set(Math.max(64, Math.min(height, window.innerHeight)));
    };

    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      handle.releasePointerCapture?.(event.pointerId);

      const height = this.#dragHeight();
      this.#dragHeight.set(null);

      // A tap without movement falls through to the click handler, which cycles the snap.
      if (moved && height !== null) {
        this.service.setSnap(this.nearestSnap(height));
      }
    };

    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  protected nearestSnap(height: number): AiSheetSnap {
    const viewport = window.innerHeight;
    const candidates: { snap: AiSheetSnap; height: number }[] = [
      { snap: 'peek', height: 96 },
      { snap: 'half', height: viewport * 0.55 },
      { snap: 'full', height: viewport - 192 },
    ];

    return candidates.reduce((closest, candidate) =>
      Math.abs(candidate.height - height) < Math.abs(closest.height - height) ? candidate : closest,
    ).snap;
  }

  protected toggleListening() {
    if (this.isListening()) {
      this.service.stop();
      return;
    }

    this.service.start(this.#translate.currentLang() || 'es');
  }

  protected onDraftInput(event: Event) {
    if (this.isListening()) {
      this.service.stop();
    }

    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected sendSuggestion(prompt: string) {
    this.draft.set(prompt);
    this.#dispatch();
  }

  protected submitDraft(event: Event) {
    event.preventDefault();
    this.#dispatch();
  }

  /** Enter envia, Mayus+Enter parte la linea: es lo que espera cualquiera que venga de un chat. */
  protected onComposerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.#dispatch();
  }

  #dispatch() {
    const prompt = this.draft().trim();
    const activeBarId = this.barId();

    if (!prompt || !activeBarId || this.service.status() === 'processing') {
      return;
    }

    this.service.stop();
    this.service.transcript.set(prompt);
    this.draft.set('');
    this.service.send(activeBarId);
  }
}
