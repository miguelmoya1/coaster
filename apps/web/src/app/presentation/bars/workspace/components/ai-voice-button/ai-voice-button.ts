import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { BarId } from '@coaster/common';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { AiVoiceService } from './ai-voice.service';

@Component({
  selector: 'coaster-ai-voice-button',
  imports: [MatButton, MatFabButton, MatIconButton, MatIcon, CdkDrag, TranslatePipe],
  template: `
    @if (service.isSupported()) {
      <!-- Voice Overlay Card -->
      @if (isOpen()) {
        <div
          class="voice-card fixed bottom-28 left-4 right-4 z-[9999] md:bottom-auto md:top-20 md:right-6 md:left-auto md:w-96 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-5 flex flex-col gap-4 text-white shadow-elevated transition-all duration-300"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <div class="relative flex h-3 w-3">
                @switch (service.status()) {
                  @case ('listening') {
                    <span
                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                    ></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  }
                  @case ('paused') {
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  }
                  @case ('processing') {
                    <span
                      class="animate-spin absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"
                    ></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                  }
                  @case ('success') {
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  }
                  @case ('error') {
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  }
                  @default {
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-zinc-500"></span>
                  }
                }
              </div>
              <span class="text-sm font-semibold tracking-wide text-zinc-200">
                {{ 'ai_voice.title' | translate }}
              </span>
              <span class="text-xs text-zinc-400 font-medium ml-1.5">
                • {{ 'ai_voice.status.' + service.status() | translate }}
              </span>
            </div>

            <div class="flex items-center gap-1">
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

          <!-- Card Body / Transcription -->
          <div class="flex flex-col gap-2">
            <span class="text-xxs font-bold text-zinc-400 uppercase tracking-widest">
              {{ 'ai_voice.transcription' | translate }}
            </span>
            <div
              class="bg-white/5 border border-white/5 rounded-xl p-4 min-h-[5.5rem] max-h-[8rem] overflow-y-auto text-sm text-zinc-100 leading-relaxed scrollbar-thin"
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
              <div class="flex items-center justify-center gap-1 py-2">
                <span class="wave-bar bar-1"></span>
                <span class="wave-bar bar-2"></span>
                <span class="wave-bar bar-3"></span>
                <span class="wave-bar bar-4"></span>
                <span class="wave-bar bar-5"></span>
              </div>
            }
          </div>

          <!-- Feedback Responses -->
          @if (service.response()) {
            <div class="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-primary flex flex-col gap-2">
              <div class="flex justify-between items-start">
                <span class="font-semibold text-xs text-primary/80 uppercase tracking-wider">
                  {{ 'ai_voice.ai_response' | translate }}
                </span>
                <button mat-icon-button (click)="service.speak(service.response()!)" class="!h-6 !w-6 !min-w-6">
                  <mat-icon class="!text-primary !text-base">volume_up</mat-icon>
                </button>
              </div>
              <p class="leading-normal">{{ service.response() }}</p>
            </div>
          } @else if (service.error()) {
            <div
              class="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-400 flex flex-col gap-2"
            >
              <span class="font-semibold text-xs text-rose-400/80 uppercase tracking-wider">
                {{ 'ai_voice.error' | translate }}
              </span>
              <p class="leading-normal">{{ service.error() }}</p>
            </div>
          }

          <!-- Footer Actions -->
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <div>
              @if (service.status() === 'listening' || service.status() === 'paused') {
                <button mat-flat-button (click)="closePanel()" class="!bg-zinc-800 !text-zinc-300 !rounded-full !px-4">
                  {{ 'ai_voice.cancel' | translate }}
                </button>
              } @else if (service.status() === 'success' || service.status() === 'error') {
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
