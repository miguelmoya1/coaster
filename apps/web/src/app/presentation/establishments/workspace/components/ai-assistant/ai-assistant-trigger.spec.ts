import { asEstablishmentId } from '@coaster/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstablishmentSubscriptionStore, PlanDialogService } from '@coaster/establishment-subscription';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantTrigger } from './ai-assistant-trigger';
import { AiVoiceService } from './ai-voice.service';

describe('AiAssistantTrigger', () => {
  let fixture: ComponentFixture<AiAssistantTrigger>;

  const isReadOnly = signal(false);
  const planDialogServiceMock = { open: vi.fn() };

  const aiVoiceServiceMock = {
    isOpen: signal(false),
    status: signal('idle'),
    toggle: vi.fn(),
  };

  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  beforeEach(async () => {
    vi.clearAllMocks();
    isReadOnly.set(false);
    aiVoiceServiceMock.isOpen.set(false);
    aiVoiceServiceMock.status.set('idle');

    await TestBed.configureTestingModule({
      imports: [AiAssistantTrigger],
      providers: [
        provideTranslateService(),
        { provide: AiVoiceService, useValue: aiVoiceServiceMock },
        { provide: EstablishmentSubscriptionStore, useValue: { isReadOnly } },
        { provide: PlanDialogService, useValue: planDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantTrigger);
    fixture.componentRef.setInput('establishmentId', asEstablishmentId('establishment-1'));
    fixture.detectChanges();
  });

  it('should toggle the assistant when clicked', () => {
    button().click();

    expect(aiVoiceServiceMock.toggle).toHaveBeenCalled();
  });

  it('should show the sparkle icon when idle and the waveform while listening', () => {
    expect(button().textContent).toContain('auto_awesome');

    aiVoiceServiceMock.status.set('listening');
    fixture.detectChanges();

    expect(button().textContent).toContain('graphic_eq');
  });

  it('should flag that it is working while the panel is closed', () => {
    expect(fixture.nativeElement.querySelector('span.rounded-full')).toBeNull();

    aiVoiceServiceMock.status.set('processing');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span.rounded-full')).toBeTruthy();
  });

  it('should report its expanded state for assistive technology', () => {
    expect(button().getAttribute('aria-expanded')).toBe('false');

    aiVoiceServiceMock.isOpen.set(true);
    fixture.detectChanges();

    expect(button().getAttribute('aria-expanded')).toBe('true');
  });

  it('should push the user to the plan dialog instead of opening the assistant when read-only', () => {
    isReadOnly.set(true);
    fixture.detectChanges();

    button().dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true }));

    expect(aiVoiceServiceMock.toggle).not.toHaveBeenCalled();
    expect(planDialogServiceMock.open).toHaveBeenCalledWith('establishment-1');
  });
});
