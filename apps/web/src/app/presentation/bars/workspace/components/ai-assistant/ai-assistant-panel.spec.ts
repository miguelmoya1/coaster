import { asBarId } from '@coaster/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bar-subscription';
import { CurrentUser } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantPanel } from './ai-assistant-panel';
import { AiVoiceRepository } from './ai-voice-repository';
import { AiVoiceService } from './ai-voice.service';

describe('AiAssistantPanel', () => {
  let component: AiAssistantPanel;
  let fixture: ComponentFixture<AiAssistantPanel>;

  const matchesRail = new BehaviorSubject<{ matches: boolean }>({ matches: false });
  const breakpointObserverMock = {
    observe: vi.fn().mockReturnValue(matchesRail),
    isMatched: vi.fn().mockImplementation(() => matchesRail.value.matches),
  };

  const currentUserMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ id: 'u-1', name: 'Test User', language: 'es' }),
    },
  };

  const aiVoiceRepositoryMock = {
    executeCommand: vi.fn(),
  };

  const snap = signal<'peek' | 'half' | 'full'>('half');

  const aiVoiceServiceMock = {
    isOpen: signal(true),
    snap,
    isSupported: signal(true),
    status: signal('idle'),
    isMuted: signal(false),
    transcript: signal(''),
    response: signal(null),
    error: signal(null),
    messages: signal([]),
    streamingText: signal(''),
    toggleMute: vi.fn(),
    cancel: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    speak: vi.fn(),
    resetChat: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn(),
    setSnap: vi.fn().mockImplementation((value: 'peek' | 'half' | 'full') => snap.set(value)),
    cycleSnap: vi.fn(),
  };

  const createComponent = async (isRail: boolean) => {
    matchesRail.next({ matches: isRail });

    await TestBed.configureTestingModule({
      imports: [AiAssistantPanel],
      providers: [
        provideTranslateService(),
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: AiVoiceRepository, useValue: aiVoiceRepositoryMock },
        { provide: AiVoiceService, useValue: aiVoiceServiceMock },
        { provide: BreakpointObserver, useValue: breakpointObserverMock },
        { provide: BarSubscriptionStore, useValue: { isReadOnly: () => false } },
        { provide: PlanDialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantPanel);
    fixture.componentRef.setInput('barId', asBarId('bar-1'));
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    aiVoiceServiceMock.isOpen.set(true);
    aiVoiceServiceMock.isSupported.set(true);
    aiVoiceServiceMock.status.set('idle');
    aiVoiceServiceMock.transcript.set('');
    aiVoiceServiceMock.messages.set([]);
    snap.set('half');
  });

  describe('mobile sheet', () => {
    beforeEach(() => createComponent(false));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render only while the assistant is open', () => {
      expect(fixture.nativeElement.querySelector('aside')).toBeTruthy();

      aiVoiceServiceMock.isOpen.set(false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    });

    it('should float over the content without a backdrop so the bar stays usable', () => {
      const aside: HTMLElement = fixture.nativeElement.querySelector('aside');

      expect(aside.className).toContain('fixed');
      expect(fixture.nativeElement.querySelector('.ai-backdrop')).toBeNull();
    });

    it('should sit above the bottom nav rather than covering it', () => {
      const aside: HTMLElement = fixture.nativeElement.querySelector('aside');

      expect(aside.className).toContain('bottom-[calc(6.25rem+env(safe-area-inset-bottom))]');
      expect(aside.className).toContain('z-40');
    });

    it('should collapse to just the composer while resting at peek', () => {
      snap.set('peek');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid], .hide-scrollbar')).toBeNull();
    });

    it('should grow to a fixed height once there is a conversation to read', () => {
      const aside: HTMLElement = fixture.nativeElement.querySelector('aside');
      expect(aside.style.height).toBe('55svh');

      snap.set('full');
      fixture.detectChanges();

      expect(aside.style.height).toBe('calc(100svh - 12rem)');
    });

    it('should offer the drag handle to resize', () => {
      const handle = fixture.nativeElement.querySelector('aside > button');

      expect(handle).toBeTruthy();
      handle.click();
      expect(aiVoiceServiceMock.cycleSnap).toHaveBeenCalled();
    });

    it('should settle on the nearest snap after a drag', () => {
      expect(component['nearestSnap'](80)).toBe('peek');
      expect(component['nearestSnap'](window.innerHeight * 0.55)).toBe('half');
      expect(component['nearestSnap'](window.innerHeight - 192)).toBe('full');
    });
  });

  describe('desktop rail', () => {
    beforeEach(() => createComponent(true));

    it('should dock in the flow so it takes width from the content instead of covering it', () => {
      const aside: HTMLElement = fixture.nativeElement.querySelector('aside');

      expect(aside.className).toContain('shrink-0');
      expect(aside.className).toContain('w-[26rem]');
      expect(aside.className).not.toContain('fixed');
    });

    it('should ignore the sheet snaps and always fill the height', () => {
      snap.set('peek');
      fixture.detectChanges();

      const aside: HTMLElement = fixture.nativeElement.querySelector('aside');

      expect(aside.style.height).toBe('');
      expect(fixture.nativeElement.querySelector('aside > button')).toBeNull();
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    });
  });

  describe('composer', () => {
    beforeEach(() => createComponent(false));

    it('should send what the user typed and clear the field', () => {
      component['draft'].set('abre la mesa 4');

      component['submitDraft'](new Event('submit'));

      expect(aiVoiceServiceMock.transcript()).toBe('abre la mesa 4');
      expect(aiVoiceServiceMock.send).toHaveBeenCalledWith(asBarId('bar-1'));
      expect(component['draft']()).toBe('');
    });

    it('should ignore an empty prompt', () => {
      component['draft'].set('   ');

      component['submitDraft'](new Event('submit'));

      expect(aiVoiceServiceMock.send).not.toHaveBeenCalled();
    });

    it('should ignore a submit while the assistant is processing', () => {
      aiVoiceServiceMock.status.set('processing');
      component['draft'].set('cobra la mesa 2');

      component['submitDraft'](new Event('submit'));

      expect(aiVoiceServiceMock.send).not.toHaveBeenCalled();
    });

    it('should pour what the microphone hears into the same draft the user types in', () => {
      aiVoiceServiceMock.transcript.set('dos cañas para la mesa uno');
      fixture.detectChanges();

      expect(component['draft']()).toBe('dos cañas para la mesa uno');
    });

    it('should send a suggestion chip as a prompt', () => {
      component['sendSuggestion']('¿Cuánto llevamos hoy?');

      expect(aiVoiceServiceMock.transcript()).toBe('¿Cuánto llevamos hoy?');
      expect(aiVoiceServiceMock.send).toHaveBeenCalledWith(asBarId('bar-1'));
    });

    it('should stop dictation as soon as the user starts typing instead', () => {
      aiVoiceServiceMock.status.set('listening');
      const input = document.createElement('input');
      input.value = 'mesa 3';

      component['onDraftInput']({ target: input } as unknown as Event);

      expect(aiVoiceServiceMock.stop).toHaveBeenCalled();
      expect(component['draft']()).toBe('mesa 3');
    });

    it('should hide the microphone button when dictation is unsupported', () => {
      aiVoiceServiceMock.isSupported.set(false);
      fixture.detectChanges();

      const micButton = Array.from(fixture.nativeElement.querySelectorAll('form button')).find((button) =>
        (button as HTMLElement).textContent?.includes('mic'),
      );

      expect(micButton).toBeUndefined();
    });
  });

  describe('the message box', () => {
    const box = (): HTMLTextAreaElement => fixture.nativeElement.querySelector('form textarea');

    const pressEnter = (shiftKey: boolean) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true });
      component['onComposerKeydown'](event);
      return event;
    };

    it('should be a textarea so a long order does not run off the side', () => {
      expect(box()).not.toBeNull();
      expect(fixture.nativeElement.querySelector('form input[name="draft"]')).toBeNull();
    });

    it('should grow with the text instead of scrolling', () => {
      expect(box().classList.contains('cdk-textarea-autosize')).toBe(true);
    });

    it('should send on Enter', () => {
      component['draft'].set('dos cañas para la mesa cinco');

      const event = pressEnter(false);

      expect(event.defaultPrevented).toBe(true);
      expect(aiVoiceServiceMock.send).toHaveBeenCalledWith(asBarId('bar-1'));
    });

    it('should break the line on Shift+Enter instead of sending', () => {
      component['draft'].set('primera linea');

      const event = pressEnter(true);

      expect(event.defaultPrevented).toBe(false);
      expect(aiVoiceServiceMock.send).not.toHaveBeenCalled();
    });

    it('should ignore any other key', () => {
      component['draft'].set('hola');

      component['onComposerKeydown'](new KeyboardEvent('keydown', { key: 'a', cancelable: true }));

      expect(aiVoiceServiceMock.send).not.toHaveBeenCalled();
    });
  });
});
