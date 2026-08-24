import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtualKeyboard } from './virtual-keyboard';

describe('VirtualKeyboard', () => {
  let viewport: {
    height: number;
    offsetTop: number;
    addEventListener: ReturnType<typeof vi.fn>;
  };
  let listeners: Record<string, () => void>;
  let documentMock: Document;
  let root: HTMLElement;

  const keyboardInset = () => root.style.getPropertyValue('--keyboard-inset');

  const openKeyboardTo = (height: number) => {
    viewport.height = height;
    listeners['resize']();
  };

  beforeEach(() => {
    listeners = {};
    root = document.createElement('html');
    viewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: vi.fn((name: string, handler: () => void) => (listeners[name] = handler)),
    };

    documentMock = {
      documentElement: root,
      activeElement: null,
      addEventListener: vi.fn(),
      defaultView: { innerHeight: 800, visualViewport: viewport, setTimeout: vi.fn() },
    } as unknown as Document;

    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: documentMock }] });
    TestBed.inject(VirtualKeyboard).watch();
  });

  it('should report no inset while the keyboard is closed', () => {
    listeners['resize']();

    expect(keyboardInset()).toBe('0px');
  });

  it('should publish the keyboard height when the visual viewport shrinks', () => {
    openKeyboardTo(460);

    expect(keyboardInset()).toBe('340px');
  });

  it('should scroll a control the keyboard is covering back into view', () => {
    const input = document.createElement('input');
    input.getBoundingClientRect = () => ({ top: 600, bottom: 640 }) as DOMRect;
    input.scrollIntoView = vi.fn();
    (documentMock as { activeElement: Element | null }).activeElement = input;

    openKeyboardTo(460);

    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  });

  it('should leave a control that is already visible alone', () => {
    const input = document.createElement('input');
    input.getBoundingClientRect = () => ({ top: 100, bottom: 140 }) as DOMRect;
    input.scrollIntoView = vi.fn();
    (documentMock as { activeElement: Element | null }).activeElement = input;

    openKeyboardTo(460);

    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });

  it('should ignore whatever else holds focus', () => {
    const button = document.createElement('button');
    button.getBoundingClientRect = () => ({ top: 600, bottom: 640 }) as DOMRect;
    button.scrollIntoView = vi.fn();
    (documentMock as { activeElement: Element | null }).activeElement = button;

    openKeyboardTo(460);

    expect(button.scrollIntoView).not.toHaveBeenCalled();
  });

  it('should do nothing where the browser has no visual viewport', () => {
    const bare = {
      documentElement: document.createElement('html'),
      addEventListener: vi.fn(),
      defaultView: { innerHeight: 800 },
    } as unknown as Document;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: bare }] });

    expect(() => TestBed.inject(VirtualKeyboard).watch()).not.toThrow();
  });
});
