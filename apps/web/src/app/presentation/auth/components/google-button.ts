import { AfterViewInit, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { environment } from '@coaster/env';
import { Auth, getErrorMessage, GoogleSignIn } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-google-button',
  imports: [TranslatePipe],
  host: { class: 'block w-full' },
  template: `
    @if (available() || showMissingClientId) {
      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-3">
          <span class="bg-outline-variant/40 h-px flex-1"></span>
          <span class="text-on-surface-variant text-xs uppercase tracking-wider">{{ 'auth.or' | translate }}</span>
          <span class="bg-outline-variant/40 h-px flex-1"></span>
        </div>

        @if (available()) {
          <div #host data-testid="google-button" class="flex min-h-11 justify-center [color-scheme:light]"></div>
        } @else {
          <p data-testid="google-button-unconfigured" class="text-on-surface-variant text-center text-xs">
            {{ 'auth.google_unconfigured' | translate }}
          </p>
        }

        @if (error(); as code) {
          <span class="text-error text-center text-xs" role="alert">{{ code | translate }}</span>
        }
      </div>
    }
  `,
})
export class GoogleButton implements AfterViewInit {
  public readonly signedIn = output<void>();

  readonly #googleSignIn = inject(GoogleSignIn);
  readonly #auth = inject(Auth);

  protected readonly host = viewChild<ElementRef<HTMLElement>>('host');
  protected readonly available = this.#googleSignIn.available;
  protected readonly error = signal<string | null>(null);
  protected readonly showMissingClientId = !environment.production;

  async ngAfterViewInit(): Promise<void> {
    const host = this.host()?.nativeElement;

    if (!host) {
      return;
    }

    await this.#googleSignIn.renderButton(host, (credential) => this.#signIn(credential));
  }

  async #signIn(credential: string): Promise<void> {
    this.error.set(null);

    try {
      await this.#auth.loginWithGoogle(credential);
      this.signedIn.emit();
    } catch (error) {
      this.error.set(getErrorMessage(error));
    }
  }
}
