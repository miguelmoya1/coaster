import { Directive, DestroyRef, ElementRef, HostListener, effect, inject } from '@angular/core';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bars';

@Directive({
  selector: '[coasterRequireSubscription]',
  standalone: true,
})
export class RequireSubscriptionDirective {
  readonly #subStore = (() => {
    try {
      return inject(BarSubscriptionStore, { optional: true });
    } catch {
      return null;
    }
  })();

  readonly #planDialogService = (() => {
    try {
      return inject(PlanDialogService, { optional: true });
    } catch {
      return null;
    }
  })();

  readonly #elementRef = inject(ElementRef<HTMLElement>);
  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    const el = this.#elementRef.nativeElement;

    const handleCaptureClick = (event: MouseEvent) => {
      if (this.#subStore?.isReadOnly()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.#planDialogService?.open();
      }
    };

    // Listen in capture phase to intercept click before template (click) handlers fire
    el.addEventListener('click', handleCaptureClick, true);

    this.#destroyRef.onDestroy(() => {
      el.removeEventListener('click', handleCaptureClick, true);
    });

    effect(() => {
      const isReadOnly = this.#subStore?.isReadOnly() ?? false;

      if (isReadOnly) {
        if ('disabled' in el) {
          (el as HTMLButtonElement).disabled = true;
        }
        el.style.pointerEvents = 'auto';
        el.setAttribute('title', 'Acción no disponible: Suscripción o prueba finalizada');
        el.classList.add('opacity-60', 'cursor-not-allowed');
      } else {
        if ('disabled' in el) {
          (el as HTMLButtonElement).disabled = false;
        }
        el.style.pointerEvents = '';
        el.removeAttribute('title');
        el.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    });
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.#subStore?.isReadOnly()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.#planDialogService?.open();
    }
  }
}
