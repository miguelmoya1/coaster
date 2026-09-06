import { DOCUMENT, inject, Service } from '@angular/core';

const CONTROLS = 'input, textarea, select';

const MARGIN = 12;

const SETTLE_MS = 150;

@Service()
export class VirtualKeyboard {
  readonly #document = inject(DOCUMENT);

  watch() {
    const view = this.#document.defaultView;
    const viewport = view?.visualViewport;

    if (!view || !viewport) {
      return;
    }

    const sync = () => {
      const inset = Math.max(0, view.innerHeight - viewport.height - viewport.offsetTop);
      this.#document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
      this.#revealFocusedControl(viewport);
    };

    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    this.#document.addEventListener('focusin', () => view.setTimeout(sync, SETTLE_MS));
  }

  #revealFocusedControl(viewport: VisualViewport) {
    const focused = this.#document.activeElement;

    if (!(focused instanceof HTMLElement) || !focused.matches(CONTROLS)) {
      return;
    }

    const rect = focused.getBoundingClientRect();
    const top = viewport.offsetTop;
    const bottom = top + viewport.height;

    if (rect.bottom > bottom - MARGIN || rect.top < top + MARGIN) {
      focused.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
}
