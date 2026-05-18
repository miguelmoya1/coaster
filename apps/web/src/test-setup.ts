import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@angular/compiler';
import { beforeAll } from 'vitest';

setupTestBed();

beforeAll(() => {
  const polyfillDialog = (proto: any) => {
    if (!proto) return;
    if (typeof proto.show !== 'function') {
      proto.show = function (this: HTMLElement) {
        this.setAttribute('open', '');
      };
    }
    if (typeof proto.showModal !== 'function') {
      proto.showModal = function (this: HTMLElement) {
        this.setAttribute('open', '');
      };
    }
    if (typeof proto.close !== 'function') {
      proto.close = function (this: HTMLElement) {
        this.removeAttribute('open');
        const event = new Event('close');
        this.dispatchEvent(event);
      };
    }
  };

  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any).HTMLDialogElement) {
      (globalThis as any).HTMLDialogElement = class extends (globalThis as any).HTMLElement {};
    }
    polyfillDialog((globalThis as any).HTMLDialogElement.prototype);
    polyfillDialog((globalThis as any).HTMLElement.prototype);
  }

  if (typeof window !== 'undefined') {
    if (!(window as any).HTMLDialogElement) {
      (window as any).HTMLDialogElement = class extends (window as any).HTMLElement {};
    }
    polyfillDialog((window as any).HTMLDialogElement.prototype);
    polyfillDialog((window as any).HTMLElement.prototype);
  }
});


