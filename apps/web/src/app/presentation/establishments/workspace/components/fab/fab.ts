import { Component, DestroyRef, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { BottomBar } from '../bottom-bar/bottom-bar';

@Component({
  selector: 'coaster-fab',
  imports: [MatIcon],
  host: {
    class:
      'fixed h-[var(--bottom-fab-size)] w-[var(--bottom-fab-size)] bg-linear-to-br from-primary to-primary-container ' +
      'text-on-primary-fixed rounded-full shadow-elevated flex items-center justify-center active:scale-95 ' +
      'transition-transform z-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ' +
      'disabled:pointer-events-none disabled:active:scale-100',
    style:
      'bottom: var(--bottom-bar-inset); ' +
      'left: calc(50vw + var(--bottom-bar-width) / 2 - var(--bottom-fab-size));',
    role: 'button',
  },
  template: `<mat-icon class="text-3xl font-bold">{{ icon() }}</mat-icon>`,
})
export class Fab {
  readonly icon = input('add');
  readonly disabled = input(false);

  constructor() {
    inject(DestroyRef).onDestroy(inject(BottomBar).registerFab());
  }
}
