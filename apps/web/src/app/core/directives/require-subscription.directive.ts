import { Directive, ElementRef, HostListener, effect, inject } from '@angular/core';
import { BarSubscriptionStore } from '../../bars/store/bar-subscription.store';
import { PlanDialogService } from '../../presentation/bars/workspace/services/plan-dialog.service';

@Directive({
  selector: '[coasterRequireSubscription]',
  standalone: true,
})
export class RequireSubscriptionDirective {
  readonly #subStore = inject(BarSubscriptionStore);
  readonly #planDialogService = inject(PlanDialogService);
  readonly #elementRef = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const isReadOnly = this.#subStore.isReadOnly();
      const el = this.#elementRef.nativeElement;

      if (isReadOnly) {
        if ('disabled' in el) {
          (el as HTMLButtonElement).disabled = true;
        }
        el.setAttribute('title', 'Acción no disponible: Suscripción o prueba finalizada');
        el.classList.add('opacity-60', 'cursor-not-allowed');
      } else {
        if ('disabled' in el) {
          (el as HTMLButtonElement).disabled = false;
        }
        el.removeAttribute('title');
        el.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    });
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.#subStore.isReadOnly()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.#planDialogService.open();
    }
  }
}
