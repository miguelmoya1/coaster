import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bars';
import type { BarId } from '@coaster/common';

@Directive({
  selector: '[coasterRequireSubscription]',
  standalone: true,
})
export class RequireSubscriptionDirective {
  readonly #subStore = inject(BarSubscriptionStore, { optional: true });
  readonly #planDialogService = inject(PlanDialogService, { optional: true });
  readonly #elementRef = inject(ElementRef<HTMLElement>);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly barId = input.required<BarId>();

  constructor() {
    const el = this.#elementRef.nativeElement;

    const handleCaptureClick = (event: MouseEvent) => {
      if (this.#subStore?.isReadOnly()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.#planDialogService?.open(this.barId());
      }
    };

    const handleCaptureKeydown = (event: KeyboardEvent) => {
      if (!this.#subStore?.isReadOnly() || !['Enter', ' '].includes(event.key)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.#planDialogService?.open(this.barId());
    };

    el.addEventListener('click', handleCaptureClick, true);
    el.addEventListener('keydown', handleCaptureKeydown, true);

    this.#destroyRef.onDestroy(() => {
      el.removeEventListener('click', handleCaptureClick, true);
      el.removeEventListener('keydown', handleCaptureKeydown, true);
    });

    effect(() => {
      const isReadOnly = this.#subStore?.isReadOnly() ?? false;

      if (isReadOnly) {
        el.style.pointerEvents = 'auto';
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', this.#translate.instant('billing.action_unavailable'));
        el.classList.add('opacity-60', 'cursor-not-allowed');
      } else {
        el.style.pointerEvents = '';
        el.removeAttribute('aria-disabled');
        el.removeAttribute('title');
        el.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    });
  }
}
