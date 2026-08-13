import { httpResource } from '@angular/common/http';
import { effect, inject, resource, Service, signal, untracked } from '@angular/core';
import type { AiMessage, AiUsage, EstablishmentId } from '@coaster/common';
import { TranslateService } from '@ngx-translate/core';
import { AiUsageService } from './ai-usage.service';
import { AiVoiceRepository } from './ai-voice-repository';

export type AiVoiceStatus = 'idle' | 'listening' | 'paused' | 'processing' | 'success' | 'error';

export type AiSheetSnap = 'peek' | 'half' | 'full';

export const AI_SHEET_SNAPS: AiSheetSnap[] = ['peek', 'half', 'full'];

export const toSpokenText = (markdown: string): string =>
  markdown
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
    .replace(/^[ \t]*([-*+]|\d+\.)[ \t]+/gm, '')
    .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, '')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[.!?:,;]$/.test(line) ? line : `${line}.`))
    .join(' ')
    .trim();

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEvent {
  results: Iterable<SpeechRecognitionResult> & {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

@Service()
export class AiVoiceService {
  readonly #repository = inject(AiVoiceRepository);
  readonly #usageService = inject(AiUsageService);
  readonly #translate = inject(TranslateService);

  public readonly isOpen = signal<boolean>(false);
  public readonly snap = signal<AiSheetSnap>('peek');
  public readonly status = signal<AiVoiceStatus>('idle');
  public readonly transcript = signal<string>('');
  public readonly error = signal<string | null>(null);
  public readonly response = signal<string | null>(null);
  public readonly isSupported = signal<boolean>(false);
  public readonly isMuted = signal<boolean>(false);
  public readonly messages = signal<AiMessage[]>([]);
  public readonly streamingText = signal<string>('');

  readonly #usageEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #usageResource = httpResource<AiUsage>(() => this.#usageService.execute(this.#usageEstablishmentId()));

  public readonly usage = this.#usageResource.asReadonly();

  public watchUsage(establishmentId: EstablishmentId | undefined): void {
    this.#usageEstablishmentId.set(establishmentId);
  }

  readonly #commandParams = signal<
    { establishmentId: EstablishmentId; prompt: string; messages: AiMessage[] } | undefined
  >(undefined);

  public readonly aiResource = resource({
    params: () => this.#commandParams(),
    loader: async ({ params }) => {
      if (!params) return null;

      this.streamingText.set('');

      const answer = await this.#repository.streamCommand(
        params.establishmentId,
        params.prompt,
        params.messages,
        (delta) => {
          this.streamingText.update((current) => current + delta);
        },
      );

      this.#usageResource.reload();

      return answer;
    },
  });

  #recognition: ISpeechRecognition | null = null;
  #savedTranscript = '';
  #sessionTranscript = '';
  #lang = 'es';

  readonly #currentLang = () => this.#translate.currentLang() || 'es';

  constructor() {
    const windowObj = window as Window & {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    this.isSupported.set(!!(windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition));

    effect(() => {
      const status = this.aiResource.status();

      untracked(() => {
        if (status === 'resolved') {
          const value = this.aiResource.value();
          if (value) {
            if (value.isError && value.errorKey) {
              const errMsg = this.#translate.instant(value.errorKey);
              this.streamingText.set('');
              this.error.set(errMsg);
              this.status.set('error');
              this.speak(errMsg);
            } else {
              this.messages.update((msgs) => [...msgs, { role: 'assistant', content: value.text }]);
              this.response.set(value.text);
              this.status.set('success');
              this.speak(value.text);
            }
          }
        } else if (status === 'error') {
          this.streamingText.set('');
          const error = this.aiResource.error();
          console.error('Resource loader error:', error);
          let errMsg = this.#translate.instant('ai_voice.errors.processing');
          if (error instanceof Error) {
            errMsg = error.message;
          } else if (error && typeof error === 'object') {
            const errObj = error as Record<string, unknown>;
            const innerError = errObj['error'] as Record<string, unknown> | undefined;
            errMsg = String(innerError?.['message'] || errObj['message'] || errMsg);
          }
          this.error.set(errMsg);
          this.status.set('error');
          this.speak(errMsg);
        } else if (status === 'loading') {
          this.status.set('processing');
        }
      });
    });
  }

  #initRecognition() {
    const windowObj = window as Window & {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (this.#recognition) {
      this.#recognition.onresult = null;
      this.#recognition.onerror = null;
      this.#recognition.onend = null;
    }

    this.#recognition = new SpeechRecognition();
    this.#recognition.continuous = true;
    this.#recognition.interimResults = true;
    this.#recognition.lang = this.#lang;

    this.#recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (this.status() !== 'listening') return;

      let sessionFinal = '';
      let sessionInterim = '';

      for (const result of event.results) {
        const transcript = result?.[0]?.transcript?.trim();

        if (!transcript) continue;

        if (result.isFinal) {
          sessionFinal += `${transcript} `;
        } else {
          sessionInterim += `${transcript} `;
        }
      }

      this.#sessionTranscript = sessionFinal.trim();
      this.transcript.set(`${this.#savedTranscript} ${this.#sessionTranscript} ${sessionInterim}`.trim());
    };

    this.#recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('SpeechRecognition error:', event.error, event);
      if (event.error !== 'no-speech') {
        let userFriendlyError = this.#translate.instant('ai_voice.errors.recognition');
        if (event.error === 'not-allowed') {
          userFriendlyError = this.#translate.instant('ai_voice.errors.mic_denied');
        } else if (event.error === 'network') {
          userFriendlyError = this.#translate.instant('ai_voice.errors.network');
        }
        this.error.set(userFriendlyError);
        this.status.set('error');
        this.speak(userFriendlyError);
      }
    };

    this.#recognition.onend = () => {
      if (this.status() !== 'listening') return;

      this.#savedTranscript = `${this.#savedTranscript} ${this.#sessionTranscript}`.trim();
      this.#sessionTranscript = '';

      try {
        this.#initRecognition();
        this.#recognition?.start();
      } catch (e) {
        console.error('Failed to auto-restart speech recognition:', e);
      }
    };
  }

  public open() {
    this.isOpen.set(true);
    this.snap.set('peek');

    if (this.isSupported()) {
      this.start(this.#currentLang());
    }
  }

  public close() {
    this.isOpen.set(false);
    this.snap.set('peek');
    this.cancel();
  }

  public toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  public setSnap(snap: AiSheetSnap) {
    this.snap.set(snap);
  }

  public cycleSnap() {
    const next = AI_SHEET_SNAPS[(AI_SHEET_SNAPS.indexOf(this.snap()) + 1) % AI_SHEET_SNAPS.length];
    this.snap.set(next);
  }

  public start(lang = this.#currentLang()) {
    if (!this.isSupported()) return;
    this.#lang = lang;
    this.stopSpeaking();
    this.#savedTranscript = '';
    this.#sessionTranscript = '';
    this.transcript.set('');
    this.error.set(null);
    this.response.set(null);
    this.#commandParams.set(undefined);
    this.status.set('listening');
    try {
      this.#initRecognition();
      this.#recognition?.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }

  public pause() {
    if (this.status() !== 'listening') return;
    this.status.set('paused');
    this.#savedTranscript = this.transcript();
    this.#sessionTranscript = '';
    try {
      if (this.#recognition) {
        this.#recognition.onend = null;
        this.#recognition.stop();
      }
    } catch (e) {
      console.error('Failed to stop speech recognition on pause:', e);
    }
  }

  public resume() {
    if (this.status() !== 'paused') return;
    this.status.set('listening');
    try {
      this.#initRecognition();
      this.#recognition?.start();
    } catch (e) {
      console.error('Failed to start speech recognition on resume:', e);
    }
  }

  public stop() {
    if (this.status() !== 'listening' && this.status() !== 'paused') return;
    try {
      if (this.#recognition) {
        this.#recognition.onend = null;
        this.#recognition.stop();
      }
    } catch (e) {
      console.error('Failed to stop speech recognition:', e);
    }
    this.status.set('idle');
  }

  public cancel() {
    this.stop();
    this.stopSpeaking();
    this.#commandParams.set(undefined);
    this.status.set('idle');
    this.#savedTranscript = '';
    this.#sessionTranscript = '';
    this.transcript.set('');
    this.error.set(null);
    this.response.set(null);
  }

  public resetChat() {
    this.stop();
    this.stopSpeaking();
    this.messages.set([]);
    this.#savedTranscript = '';
    this.#sessionTranscript = '';
    this.transcript.set('');
    this.error.set(null);
    this.response.set(null);
    this.#commandParams.set(undefined);
    this.status.set('idle');
  }

  public async send(establishmentId: EstablishmentId) {
    const textToSend = this.transcript().trim();
    if (!textToSend) {
      this.cancel();
      return;
    }

    this.stop();
    this.error.set(null);
    this.response.set(null);

    const updatedMessages: AiMessage[] = [...this.messages(), { role: 'user', content: textToSend }];
    this.messages.set(updatedMessages);
    this.transcript.set('');

    if (this.snap() === 'peek') {
      this.snap.set('half');
    }

    this.#commandParams.set({ establishmentId, prompt: textToSend, messages: updatedMessages });
  }

  public speak(text: string) {
    if (this.isMuted()) return;
    this.stopSpeaking();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(toSpokenText(text));
      utterance.lang = this.#lang;
      window.speechSynthesis.speak(utterance);
    }
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public toggleMute() {
    this.isMuted.update((m) => !m);
    if (this.isMuted()) {
      this.stopSpeaking();
    }
  }
}
