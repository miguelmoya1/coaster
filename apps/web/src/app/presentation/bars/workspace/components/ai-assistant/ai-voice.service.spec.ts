import { asBarId } from '@coaster/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiVoiceRepository } from './ai-voice-repository';
import { AiVoiceService, toSpokenText } from './ai-voice.service';

describe('toSpokenText', () => {
  it('should drop emphasis markers so they are not read out loud', () => {
    expect(toSpokenText('Hoy llevas **340 €**, un *12%* más.')).toBe('Hoy llevas 340 €, un 12% más.');
  });

  it('should turn a bullet list into sentences the synthesiser can pause between', () => {
    expect(toSpokenText('Bajo mínimos:\n\n- Cerveza: 3\n- Vino: 1')).toBe('Bajo mínimos: Cerveza: 3. Vino: 1.');
  });

  it('should strip headings, links and code', () => {
    expect(toSpokenText('## Resumen\nMira el [panel](https://x.test) y usa `npm run dev`')).toBe(
      'Resumen. Mira el panel y usa npm run dev.',
    );
  });

  it('should keep the words of a plain answer, closing it so it does not trail off', () => {
    expect(toSpokenText('Mesa 5 creada con éxito')).toBe('Mesa 5 creada con éxito.');
    expect(toSpokenText('¿Confirmas que la borro?')).toBe('¿Confirmas que la borro?');
  });
});

describe('AiVoiceService', () => {
  let service: AiVoiceService;

  const repositoryMock = {
    executeCommand: vi.fn().mockResolvedValue({ text: 'Mesa 5 creada con éxito' }),
    streamCommand: vi.fn().mockImplementation(async (_barId, _prompt, _messages, onDelta: (delta: string) => void) => {
      onDelta('Mesa 5 creada con éxito');
      return { text: 'Mesa 5 creada con éxito' };
    }),
  };

  class MockSpeechRecognition {
    static latestInstance: MockSpeechRecognition | null = null;

    continuous = false;
    interimResults = false;
    lang = 'es';
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn();

    constructor() {
      MockSpeechRecognition.latestInstance = this;
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    MockSpeechRecognition.latestInstance = null;
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      writable: true,
      value: MockSpeechRecognition,
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        AiVoiceService,
        { provide: AiVoiceRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(AiVoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isSupported', () => {
    it('should set isSupported to true if SpeechRecognition is on window', () => {
      expect(service.isSupported()).toBe(true);
    });
  });

  it('should avoid transcript duplication when recognition emits cumulative results', () => {
    service.start('es');

    const firstResultEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'hola' },
        },
      ],
    };
    MockSpeechRecognition.latestInstance?.onresult?.(firstResultEvent);
    expect(service.transcript()).toBe('hola');

    const secondResultEvent = {
      resultIndex: 1,
      results: [
        {
          isFinal: true,
          0: { transcript: 'hola' },
        },
        {
          isFinal: true,
          0: { transcript: 'mundo' },
        },
      ],
    };
    MockSpeechRecognition.latestInstance?.onresult?.(secondResultEvent);
    expect(service.transcript()).toBe('hola mundo');
  });

  it('should not repeat what was already final when the engine re-sends it', () => {
    service.start('es');
    const recognition = MockSpeechRecognition.latestInstance;

    recognition?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'quiero crear una mesa' } }],
    });

    // Android keeps resultIndex at 0 and re-sends the whole list on every utterance.
    recognition?.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: 'quiero crear una mesa' } },
        { isFinal: true, 0: { transcript: 'para cuatro personas' } },
      ],
    });

    expect(service.transcript()).toBe('quiero crear una mesa para cuatro personas');
  });

  it('should replace the interim guess instead of stacking it', () => {
    service.start('es');
    const recognition = MockSpeechRecognition.latestInstance;

    recognition?.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'mesa' } }] });
    recognition?.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'mesa cinco' } }] });
    recognition?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'mesa cinco' } }] });

    expect(service.transcript()).toBe('mesa cinco');
  });

  it('should keep what was said before the engine restarted itself mid dictation', () => {
    service.start('es');

    MockSpeechRecognition.latestInstance?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'hola' } }],
    });

    // Mobile ends the session on every pause in speech, and the service starts a fresh one.
    MockSpeechRecognition.latestInstance?.onend?.();

    MockSpeechRecognition.latestInstance?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'mundo' } }],
    });

    expect(service.transcript()).toBe('hola mundo');
  });

  describe('state transitions', () => {
    it('should start with idle state', () => {
      expect(service.status()).toBe('idle');
      expect(service.transcript()).toBe('');
      expect(service.error()).toBeNull();
      expect(service.response()).toBeNull();
    });

    it('should transition through states on send', async () => {
      service.transcript.set('Crear mesa Mesa 5');

      service.send(asBarId('bar-1'));
      TestBed.flushEffects();

      expect(service.status()).toBe('processing');
      expect(service.error()).toBeNull();

      await vi.waitFor(() => {
        TestBed.flushEffects();
        expect(service.status()).toBe('success');
      });

      expect(service.response()).toBe('Mesa 5 creada con éxito');
      expect(repositoryMock.streamCommand).toHaveBeenCalledWith(
        asBarId('bar-1'),
        'Crear mesa Mesa 5',
        [{ role: 'user', content: 'Crear mesa Mesa 5' }],
        expect.any(Function),
      );
    });

    it('should surface the answer progressively while it streams', async () => {
      repositoryMock.streamCommand.mockImplementationOnce(
        async (_barId: unknown, _prompt: unknown, _messages: unknown, onDelta: (delta: string) => void) => {
          onDelta('Mesa 5 ');
          expect(service.streamingText()).toBe('Mesa 5 ');
          onDelta('creada');
          return { text: 'Mesa 5 creada' };
        },
      );

      service.transcript.set('Crear mesa Mesa 5');
      await service.send(asBarId('bar-1'));
      TestBed.flushEffects();

      await vi.waitFor(() => {
        TestBed.flushEffects();
        expect(service.status()).toBe('success');
      });

      expect(service.streamingText()).toBe('Mesa 5 creada');
    });

    it('should not replay the answer into the transcript when the user toggles mute', async () => {
      service.transcript.set('Crear mesa Mesa 5');

      service.send(asBarId('bar-1'));
      TestBed.flushEffects();

      await vi.waitFor(() => {
        TestBed.flushEffects();
        expect(service.status()).toBe('success');
      });

      expect(service.messages().filter((message) => message.role === 'assistant')).toHaveLength(1);

      service.toggleMute();
      TestBed.flushEffects();
      service.toggleMute();
      TestBed.flushEffects();

      expect(service.messages().filter((message) => message.role === 'assistant')).toHaveLength(1);
      expect(service.messages()).toHaveLength(2);
    });

    it('should set error state on send failure', async () => {
      repositoryMock.streamCommand.mockRejectedValueOnce(new Error('Backend error'));
      service.transcript.set('Crear mesa Mesa 5');

      service.send(asBarId('bar-1'));
      TestBed.flushEffects();

      await vi.waitFor(() => {
        TestBed.flushEffects();
        expect(service.status()).toBe('error');
      });

      expect(service.error()).toBe('Backend error');
    });
  });
});
