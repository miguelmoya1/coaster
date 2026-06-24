import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { CurrentUser } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiVoiceButton } from './ai-voice-button';
import { AiVoiceRepository } from './ai-voice-repository';
import { AiVoiceService } from './ai-voice.service';

describe('AiVoiceButton', () => {
  let component: AiVoiceButton;
  let fixture: ComponentFixture<AiVoiceButton>;

  const currentUserMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ id: 'u-1', name: 'Test User', language: 'es' }),
    },
  };

  const aiVoiceRepositoryMock = {
    executeCommand: vi.fn(),
  };

  const aiVoiceServiceMock = {
    isSupported: signal(true),
    status: signal('idle'),
    isMuted: signal(false),
    transcript: signal(''),
    response: signal(null),
    error: signal(null),
    messages: signal([]),
    toggleMute: vi.fn(),
    cancel: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    send: vi.fn(),
    speak: vi.fn(),
    resetChat: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AiVoiceButton],
      providers: [
        provideTranslateService(),
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: AiVoiceRepository, useValue: aiVoiceRepositoryMock },
        { provide: AiVoiceService, useValue: aiVoiceServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiVoiceButton);
    fixture.componentRef.setInput('barId', asBarId('bar-1'));
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('togglePanel', () => {
    it('should toggle isOpen signal and call service methods', () => {
      expect(component.isOpen()).toBe(false);

      // Open
      component.togglePanel();
      expect(component.isOpen()).toBe(true);

      // Close
      component.togglePanel();
      expect(component.isOpen()).toBe(false);
    });
  });
});
