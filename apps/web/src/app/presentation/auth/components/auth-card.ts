import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'coaster-auth-card',
  imports: [RouterLink],
  host: { class: 'block' },
  template: `
    <div class="relative min-h-dvh overflow-hidden bg-background">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0">
        <div
          class="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-radial from-primary/20 via-secondary/10 to-transparent blur-3xl"
        ></div>
        <div
          class="absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-radial from-secondary/15 via-transparent to-transparent blur-3xl"
        ></div>
      </div>

      <div class="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
        <a routerLink="/" class="flex items-center justify-center gap-2.5">
          <img src="logo.webp" alt="" width="36" height="36" class="h-9 w-9 shrink-0" />
          <span class="text-2xl font-black tracking-tight">Coaster</span>
        </a>

        <div
          [attr.data-testid]="testId()"
          class="rounded-3xl border border-white/10 bg-surface-container-low/70 p-6 backdrop-blur-xl sm:p-8"
        >
          <div class="flex flex-col gap-1.5 text-center">
            <h1 class="text-on-surface text-2xl font-black tracking-tight">{{ heading() }}</h1>
            @if (subtitle()) {
              <p class="text-on-surface-variant text-sm text-balance">{{ subtitle() }}</p>
            }
          </div>

          <div class="mt-7">
            <ng-content />
          </div>
        </div>

        <div class="flex flex-col items-center gap-2 text-sm">
          <ng-content select="[footer]" />
        </div>
      </div>
    </div>
  `,
})
export class AuthCard {
  public readonly heading = input.required<string>();
  public readonly subtitle = input<string>('');
  public readonly testId = input<string>('auth-card');
}
