import { AfterViewInit, Component, ElementRef, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-password-reveal',
  imports: [MatIconButton, MatIcon, TranslatePipe],
  host: { class: 'relative block' },
  template: `
    <ng-content />

    <button
      mat-icon-button
      type="button"
      tabindex="0"
      data-testid="password-reveal-btn"
      class="absolute! top-1/2 right-1 size-9! -translate-y-1/2"
      [attr.aria-label]="(revealed() ? 'auth.fields.password_hide' : 'auth.fields.password_show') | translate"
      [attr.aria-pressed]="revealed()"
      (click)="toggle()"
    >
      <mat-icon class="text-on-surface-variant text-lg!">{{ revealed() ? 'visibility_off' : 'visibility' }}</mat-icon>
    </button>
  `,
})
export class PasswordReveal implements AfterViewInit {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly revealed = signal(false);

  ngAfterViewInit(): void {
    this.#input()?.classList.add('pr-11!');
  }

  protected toggle(): void {
    const input = this.#input();

    if (!input) {
      return;
    }

    this.revealed.update((revealed) => !revealed);
    input.type = this.revealed() ? 'text' : 'password';
    input.focus();
  }

  #input(): HTMLInputElement | null {
    return this.#host.nativeElement.querySelector('input');
  }
}
