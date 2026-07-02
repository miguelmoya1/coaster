import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiVoiceRepository } from './ai-voice-repository';
import { AiVoiceService } from './ai-voice.service';

describe('AiVoiceService', () => {
  let service: AiVoiceService;

  const repositoryMock = {
    executeCommand: vi.fn().mockResolvedValue({ text: 'Mesa 5 creada con éxito' }),
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
      expect(repositoryMock.executeCommand).toHaveBeenCalledWith(asBarId('bar-1'), 'Crear mesa Mesa 5', [
        { role: 'user', content: 'Crear mesa Mesa 5' },
      ]);
    });

    it('should set error state on send failure', async () => {
      repositoryMock.executeCommand.mockRejectedValueOnce(new Error('Backend error'));
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
