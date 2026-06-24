import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { BarId } from '@coaster/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AiVoiceService } from './ai-voice.service';

@Component({
  selector: 'coaster-ai-voice-button',
  imports: [MatButton, MatFabButton, MatIconButton, MatIcon, CdkDrag, TranslatePipe],
  template: `
    @if (service.isSupported()) {
      <!-- Voice Overlay Card -->
      @if (isOpen()) {
        <div
          class="voice-card fixed bottom-28 left-4 right-4 z-[9999] md:bottom-auto md:top-20 md:right-6 md:left-auto md:w-96 h-[32rem] max-h-[80vh] rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-5 flex flex-col gap-4 text-white shadow-elevated transition-all duration-300"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold tracking-wide text-zinc-200">
                {{ 'ai_voice.title' | translate }}
              </span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <div class="relative flex h-2 w-2">
                  @switch (service.status()) {
                    @case ('listening') {
                      <span
                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    }
                    @case ('paused') {
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    }
                    @case ('processing') {
                      <span
                        class="animate-spin absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    }
                    @case ('success') {
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    }
                    @case ('error') {
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    }
                    @default {
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
                    }
                  }
                </div>
                <span class="text-xs text-zinc-400 font-medium">
                  {{ 'ai_voice.status.' + service.status() | translate }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                mat-icon-button
                (click)="service.resetChat()"
                [disabled]="service.messages().length === 0"
                class="!h-8 !w-8 !min-w-8"
                [title]="'ai_voice.reset_chat' | translate"
              >
                <mat-icon class="!text-zinc-400 !text-lg" [class.opacity-40]="service.messages().length === 0"
                  >delete</mat-icon
                >
              </button>
              <button mat-icon-button (click)="service.toggleMute()" class="!h-8 !w-8 !min-w-8">
                <mat-icon class="!text-zinc-400 !text-lg">
                  {{ service.isMuted() ? 'volume_off' : 'volume_up' }}
                </mat-icon>
              </button>
              <button mat-icon-button (click)="closePanel()" class="!h-8 !w-8 !min-w-8">
                <mat-icon class="!text-zinc-400 !text-lg">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Messages List / Chat History -->
          <div #chatContainer class="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-3 py-1">
            @if (service.messages().length === 0) {
              <div class="flex-1 flex flex-col items-center justify-center text-center p-4 text-zinc-500 my-auto">
                <mat-icon class="!text-4xl !h-10 !w-10 mb-2 opacity-40">chat_bubble_outline</mat-icon>
                <p class="text-xs">{{ 'ai_voice.empty_chat' | translate }}</p>
              </div>
            } @else {
              @for (msg of service.messages(); track $index) {
                <div
                  class="flex flex-col gap-1"
                  [class.items-end]="msg.role === 'user'"
                  [class.items-start]="msg.role === 'assistant'"
                >
                  <span class="text-[10px] text-zinc-500 px-2 font-medium">
                    {{ (msg.role === 'user' ? 'ai_voice.user' : 'ai_voice.assistant') | translate }}
                  </span>
                  <div
                    class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                    [class.bg-primary/20]="msg.role === 'user'"
                    [class.text-primary]="msg.role === 'user'"
                    [class.border]="msg.role === 'user'"
                    [class.border-primary/30]="msg.role === 'user'"
                    [class.bg-white/5]="msg.role === 'assistant'"
                    [class.text-zinc-100]="msg.role === 'assistant'"
                    [class.border]="msg.role === 'assistant'"
                    [class.border-white/5]="msg.role === 'assistant'"
                  >
                    <div class="flex justify-between items-start gap-4">
                      <p class="whitespace-pre-line">{{ msg.content }}</p>
                      @if (msg.role === 'assistant') {
                        <button
                          mat-icon-button
                          (click)="service.speak(msg.content)"
                          class="!h-5 !w-5 !min-w-5 !p-0 -mr-1 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <mat-icon class="!text-zinc-400 !text-sm !h-3.5 !w-3.5">volume_up</mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Current Transcript / Listening Feedback -->
          @if (service.transcript() || service.status() === 'listening') {
            <div class="flex flex-col gap-1.5 border-t border-white/5 pt-3">
              <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {{ 'ai_voice.transcription' | translate }}
              </span>
              <div
                class="bg-white/5 border border-white/5 rounded-xl p-3 min-h-[4rem] max-h-[5.5rem] overflow-y-auto text-sm text-zinc-100 leading-relaxed scrollbar-thin"
              >
                @if (service.transcript()) {
                  {{ service.transcript() }}
                } @else {
                  <span class="text-zinc-500 italic">
                    {{ 'ai_voice.placeholder' | translate }}
                  </span>
                }
              </div>

              <!-- Soundwave Visualizer (Only visible when listening) -->
              @if (service.status() === 'listening') {
                <div class="flex items-center justify-center gap-1 py-1">
                  <span class="wave-bar bar-1"></span>
                  <span class="wave-bar bar-2"></span>
                  <span class="wave-bar bar-3"></span>
                  <span class="wave-bar bar-4"></span>
                  <span class="wave-bar bar-5"></span>
                </div>
              }
            </div>
          }

          <!-- Error Feedback -->
          @if (service.error()) {
            <div
              class="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-400 flex flex-col gap-1"
            >
              <span class="font-semibold text-xs text-rose-400/80 uppercase tracking-wider">
                {{ 'ai_voice.error' | translate }}
              </span>
              <p class="leading-normal text-xs">{{ service.error() }}</p>
            </div>
          }

          <!-- Footer Actions -->
          <div class="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
            <div>
              @if (service.status() === 'listening' || service.status() === 'paused') {
                <button mat-flat-button (click)="closePanel()" class="!bg-zinc-800 !text-zinc-300 !rounded-full !px-4">
                  {{ 'ai_voice.cancel' | translate }}
                </button>
              } @else {
                <button
                  mat-flat-button
                  (click)="restartVoice()"
                  class="!bg-zinc-800 !text-zinc-300 !rounded-full !px-4"
                >
                  {{ 'ai_voice.speak_again' | translate }}
                </button>
              }
            </div>

            <div class="flex items-center gap-2">
              @if (service.status() === 'listening') {
                <button mat-icon-button (click)="service.pause()">
                  <mat-icon class="!text-amber-500">pause</mat-icon>
                </button>
              } @else if (service.status() === 'paused') {
                <button mat-icon-button (click)="service.resume()">
                  <mat-icon class="!text-emerald-500">play_arrow</mat-icon>
                </button>
              }

              @if (service.status() === 'listening' || service.status() === 'paused') {
                <button
                  mat-fab
                  extended
                  (click)="sendVoice()"
                  [disabled]="!service.transcript().trim()"
                  class="!bg-primary !text-black !rounded-full !px-4 !h-10 !shadow-lg disabled:opacity-40 disabled:pointer-events-none"
                >
                  <mat-icon>send</mat-icon>
                  <span>{{ 'ai_voice.send' | translate }}</span>
                </button>
              } @else if (service.status() === 'processing') {
                <div class="flex items-center gap-2 text-zinc-400 text-sm">
                  <span class="animate-spin border-2 border-primary border-t-transparent rounded-full h-4 w-4"></span>
                  <span>{{ 'ai_voice.processing' | translate }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Floating Button -->
      <button
        mat-fab
        cdkDrag
        (click)="togglePanel()"
        [class.listening-pulse]="service.status() === 'listening'"
        [class.paused-border]="service.status() === 'paused'"
        style="position: fixed; top: 5rem; right: 1.5rem; z-index: 9999;"
        [title]="(isOpen() ? 'ai_voice.tooltip_close' : 'ai_voice.tooltip_open') | translate"
      >
        <mat-icon>{{ service.status() === 'listening' ? 'hearing' : 'mic' }}</mat-icon>
      </button>
    }
  `,
  host: {
    style: 'position: absolute;',
  },
  styles: [
    `
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      @keyframes mic-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 145, 89, 0.7);
        }
        70% {
          box-shadow: 0 0 0 15px rgba(255, 145, 89, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 145, 89, 0);
        }
      }

      .listening-pulse {
        animation: mic-pulse 1.8s infinite !important;
        background-color: var(--color-primary-dim) !important;
      }

      .paused-border {
        border: 2px dashed var(--color-secondary) !important;
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
        height: 16px;
      }
      .bar-2 {
        animation-delay: 0.3s;
        height: 22px;
      }
      .bar-3 {
        animation-delay: 0.5s;
        height: 14px;
      }
      .bar-4 {
        animation-delay: 0.2s;
        height: 26px;
      }
      .bar-5 {
        animation-delay: 0.4s;
        height: 18px;
      }

      @keyframes soundwave {
        0% {
          transform: scaleY(0.4);
        }
        100% {
          transform: scaleY(1.4);
        }
      }

      /* Custom scrollbar to keep layout premium */
      .scrollbar-thin::-webkit-scrollbar {
        width: 4px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `,
  ],
})
export class AiVoiceButton {
  public readonly barId = input.required<BarId>();

  readonly service = inject(AiVoiceService);
  readonly #translate = inject(TranslateService);

  public readonly isOpen = signal(false);
  readonly chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  constructor() {
    effect(() => {
      const _messages = this.service.messages();
      const open = this.isOpen();
      const container = this.chatContainer();
      if (open && container) {
        setTimeout(() => {
          const el = container.nativeElement;
          el.scrollTop = el.scrollHeight;
        }, 50);
      }
    });
  }

  protected readonly currentLang = computed<string>(() => {
    return this.#translate.currentLang() || 'es';
  });

  public togglePanel() {
    if (this.isOpen()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  public openPanel() {
    this.isOpen.set(true);
    this.service.start(this.currentLang());
  }

  public closePanel() {
    this.isOpen.set(false);
    this.service.cancel();
  }

  public cancelVoice() {
    this.service.cancel();
  }

  public restartVoice() {
    this.service.start(this.currentLang());
  }

  public sendVoice() {
    const activeBarId = this.barId();
    if (activeBarId) {
      this.service.send(activeBarId);
    }
  }
}
