import { effect, inject, resource, Service, signal } from '@angular/core';
import type { BarId } from '@coaster/common';
import { TranslateService } from '@ngx-translate/core';
import { AiVoiceRepository } from './ai-voice-repository';

export type AiVoiceStatus = 'idle' | 'listening' | 'paused' | 'processing' | 'success' | 'error';

@Service()
export class AiVoiceService {
  readonly #repository = inject(AiVoiceRepository);
  readonly #translate = inject(TranslateService);

  public readonly status = signal<AiVoiceStatus>('idle');
  public readonly transcript = signal<string>('');
  public readonly error = signal<string | null>(null);
  public readonly response = signal<string | null>(null);
  public readonly isSupported = signal<boolean>(false);
  public readonly isMuted = signal<boolean>(false);

  readonly #commandParams = signal<{ barId: BarId; prompt: string } | undefined>(undefined);

  // Angular 19+ Resource API for handling the async POST request reactively
  public readonly aiResource = resource({
    params: () => this.#commandParams(),
    loader: async ({ params }) => {
      if (!params) return null;
      return await this.#repository.executeCommand(params.barId, params.prompt);
    },
  });

  #recognition: any = null;
  #savedTranscript = '';
  #lang = 'es';

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.isSupported.set(!!SpeechRecognition);

    // Effect to reactively handle resource state changes
    effect(() => {
      const status = this.aiResource.status();

      if (status === 'resolved') {
        const value = this.aiResource.value();
        if (value) {
          this.response.set(value.text);
          this.status.set('success');
          this.speak(value.text);
        }
      } else if (status === 'error') {
        const error = this.aiResource.error();
        console.error('Resource loader error:', error);
        const errMsg = (error as any).error?.message || (error as any).message || this.#translate.instant('ai_voice.errors.processing');
        this.error.set(errMsg);
        this.status.set('error');
        this.speak(errMsg);
      } else if (status === 'loading') {
        this.status.set('processing');
      }
    });
  }

  #initRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.#recognition = new SpeechRecognition();
    this.#recognition.continuous = true;
    this.#recognition.interimResults = true;
    this.#recognition.lang = this.#lang;

    this.#recognition.onresult = (event: any) => {
      let sessionFinal = '';
      let sessionInterim = '';
      
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript + ' ';
        } else {
          sessionInterim += result[0].transcript;
        }
      }
      
      const fullTranscript = (this.#savedTranscript + ' ' + sessionFinal + sessionInterim).trim();
      this.transcript.set(fullTranscript);
    };

    this.#recognition.onerror = (event: any) => {
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
      if (this.status() === 'listening') {
        try {
          this.#initRecognition();
          this.#recognition.start();
        } catch (e) {
          console.error('Failed to auto-restart speech recognition:', e);
        }
      }
    };
  }

  public start(lang: string = 'es') {
    if (!this.isSupported()) return;
    this.#lang = lang;
    this.stopSpeaking();
    this.#savedTranscript = '';
    this.transcript.set('');
    this.error.set(null);
    this.response.set(null);
    this.#commandParams.set(undefined);
    this.status.set('listening');
    try {
      this.#initRecognition();
      this.#recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }

  public pause() {
    if (this.status() !== 'listening') return;
    this.status.set('paused');
    this.#savedTranscript = this.transcript();
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
      this.#recognition.start();
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
    this.transcript.set('');
    this.error.set(null);
    this.response.set(null);
  }

  public async send(barId: BarId) {
    const textToSend = this.transcript().trim();
    if (!textToSend) {
      this.cancel();
      return;
    }

    this.stop();
    this.error.set(null);
    this.response.set(null);
    
    // Set the command params to trigger the resource loader reactively
    this.#commandParams.set({ barId, prompt: textToSend });
  }

  public speak(text: string) {
    if (this.isMuted()) return;
    this.stopSpeaking();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
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
    this.isMuted.update(m => !m);
    if (this.isMuted()) {
      this.stopSpeaking();
    }
  }
}
