import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface ModuleCard {
  icon: string;
  titleKey: string;
  descKey: string;
  tagKey: string;
  featured: boolean;
}

interface Step {
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'coaster-landing',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  host: {
    class: 'block min-h-svh bg-surface text-white selection:bg-primary/30 selection:text-primary antialiased',
  },
  template: `
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        class="absolute -top-40 -left-40 w-96 h-96 bg-radial from-primary/15 via-secondary/5 to-transparent rounded-full blur-3xl"
      ></div>
      <div
        class="absolute bottom-0 -right-40 w-96 h-96 bg-radial from-primary/10 via-transparent to-transparent rounded-full blur-3xl"
      ></div>
    </div>

    <header class="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/10">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <a routerLink="/" class="flex items-center gap-2.5 min-w-0">
          <span
            class="h-9 w-9 shrink-0 rounded-xl bg-linear-to-tr from-primary to-secondary text-black grid place-items-center font-black text-lg"
          >
            C
          </span>
          <span class="font-black tracking-tight text-xl sm:text-2xl truncate">Coaster</span>
        </a>

        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#modulos" class="hover:text-primary transition-colors">{{ 'landing.nav.modules' | translate }}</a>
          <a href="#como-funciona" class="hover:text-primary transition-colors">
            {{ 'landing.nav.what_it_is' | translate }}
          </a>
          <a href="#precios" class="hover:text-primary transition-colors">{{ 'landing.nav.pricing' | translate }}</a>
        </nav>

        <a
          mat-flat-button
          routerLink="/login"
          class="bg-primary! text-black! font-bold! rounded-xl! shrink-0 px-4! sm:px-6!"
        >
          {{ 'landing.nav.try_free' | translate }}
        </a>
      </div>
    </header>

    <main class="relative z-10">
      <section class="mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-24 text-center">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        >
          {{ 'landing.hero.badge' | translate }}
        </span>

        <h1 class="mt-6 text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
          {{ 'landing.hero.title_main' | translate }}
          <span class="block bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
            {{ 'landing.hero.title_gradient' | translate }}
          </span>
        </h1>

        <p class="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
          {{ 'landing.hero.subtitle' | translate }}
        </p>

        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a mat-flat-button routerLink="/login" class="bg-primary! text-black! font-bold! rounded-xl! px-8! py-3!">
            {{ 'landing.hero.cta_primary' | translate }}
          </a>
          <a href="#precios" mat-stroked-button class="rounded-xl! px-8! py-3! border-white/20! text-white!">
            {{ 'landing.hero.cta_secondary' | translate }}
          </a>
        </div>

        <p class="mt-5 text-xs text-slate-400">
          {{ 'landing.hero.badge_no_card' | translate }} · {{ 'landing.hero.badge_quick_setup' | translate }}
        </p>
      </section>

      <section id="modulos" class="border-t border-white/10 bg-surface-container-low/40 py-20 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <header class="max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.modules.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
              {{ 'landing.modules.title' | translate }}
            </h2>
            <p class="mt-4 text-slate-300 leading-relaxed">{{ 'landing.modules.subtitle' | translate }}</p>
          </header>

          <div class="mt-10 grid gap-4 sm:grid-cols-3">
            @for (card of moduleCards; track card.titleKey) {
              <article
                class="rounded-2xl border p-6 flex flex-col gap-3"
                [class]="card.featured ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-white/[0.02]'"
              >
                <span class="text-3xl" aria-hidden="true">{{ card.icon }}</span>

                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-lg">{{ card.titleKey | translate }}</h3>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    [class]="card.featured ? 'bg-primary/20 text-primary' : 'bg-white/10 text-slate-300'"
                  >
                    {{ card.tagKey | translate }}
                  </span>
                </div>

                <p class="text-sm text-slate-300 leading-relaxed">{{ card.descKey | translate }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section id="como-funciona" class="py-20 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <header class="max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.how.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">{{ 'landing.how.title' | translate }}</h2>
          </header>

          <ol class="mt-10 grid gap-6 sm:grid-cols-3">
            @for (step of steps; track step.titleKey; let i = $index) {
              <li class="flex flex-col gap-2">
                <span
                  class="h-9 w-9 rounded-xl bg-primary/15 text-primary grid place-items-center font-black text-sm"
                  aria-hidden="true"
                >
                  {{ i + 1 }}
                </span>
                <h3 class="font-bold">{{ step.titleKey | translate }}</h3>
                <p class="text-sm text-slate-300 leading-relaxed">{{ step.descKey | translate }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <section id="precios" class="border-t border-white/10 bg-surface-container-low/40 py-20 sm:py-24">
        <div class="mx-auto max-w-4xl px-4 sm:px-6">
          <header class="text-center">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.pricing.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
              {{ 'landing.pricing.title' | translate }}
            </h2>
            <p class="mt-3 text-slate-300">{{ 'landing.pricing.subtitle' | translate }}</p>
          </header>

          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <article class="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-4">
              <div>
                <h3 class="font-bold text-lg">{{ 'landing.pricing.free_title' | translate }}</h3>
                <p class="mt-1 text-sm text-slate-400">{{ 'landing.pricing.free_desc' | translate }}</p>
              </div>

              <p class="flex items-baseline gap-1">
                <span class="text-3xl sm:text-4xl font-black tabular-nums">
                  {{ 'landing.pricing.free_price' | translate }}
                </span>
                <span class="text-sm text-slate-400">{{ 'landing.pricing.free_period' | translate }}</span>
              </p>

              <ul class="flex flex-col gap-2 text-sm text-slate-300">
                @for (feature of freeFeatures; track feature) {
                  <li class="flex gap-2">
                    <span class="text-primary" aria-hidden="true">✓</span>
                    <span>{{ feature | translate }}</span>
                  </li>
                }
              </ul>

              <a
                mat-stroked-button
                routerLink="/login"
                class="mt-auto rounded-xl! border-white/20! text-white! font-bold!"
              >
                {{ 'landing.pricing.free_cta' | translate }}
              </a>
            </article>

            <article class="rounded-2xl border border-primary/40 bg-primary/5 p-6 flex flex-col gap-4 relative">
              <span
                class="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-black uppercase tracking-wide"
              >
                {{ 'landing.pricing.pro_badge' | translate }}
              </span>

              <div>
                <h3 class="font-bold text-lg">{{ 'landing.pricing.pro_title' | translate }}</h3>
                <p class="mt-1 text-sm text-slate-400">{{ 'landing.pricing.pro_desc' | translate }}</p>
              </div>

              <p class="flex items-baseline gap-1">
                <span class="text-3xl sm:text-4xl font-black tabular-nums text-primary">
                  {{ 'landing.pricing.pro_price' | translate }}
                </span>
                <span class="text-sm text-slate-400">{{ 'landing.pricing.pro_period' | translate }}</span>
              </p>

              <ul class="flex flex-col gap-2 text-sm text-slate-300">
                @for (feature of proFeatures; track feature) {
                  <li class="flex gap-2">
                    <span class="text-primary" aria-hidden="true">✓</span>
                    <span>{{ feature | translate }}</span>
                  </li>
                }
              </ul>

              <a mat-flat-button routerLink="/login" class="mt-auto bg-primary! text-black! font-bold! rounded-xl!">
                {{ 'landing.pricing.pro_cta' | translate }}
              </a>
            </article>
          </div>

          <p class="mt-6 text-center text-xs text-slate-400">{{ 'landing.pricing.note' | translate }}</p>
        </div>
      </section>

      <section class="py-20 sm:py-24">
        <div class="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight">{{ 'landing.cta.title' | translate }}</h2>
          <p class="mt-3 text-slate-300">{{ 'landing.cta.subtitle' | translate }}</p>

          <a
            mat-flat-button
            routerLink="/login"
            class="mt-7 bg-primary! text-black! font-bold! rounded-xl! px-8! py-3!"
          >
            {{ 'landing.cta.button' | translate }}
          </a>
        </div>
      </section>
    </main>

    <footer class="relative z-10 border-t border-white/10 py-10">
      <div
        class="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400"
      >
        <p>{{ 'landing.footer.tagline' | translate }}</p>
        <p>© {{ year }} Coaster. {{ 'landing.footer.rights' | translate }}</p>
      </div>
    </footer>
  `,
})
export default class Landing {
  protected readonly year = new Date().getFullYear();

  protected readonly moduleCards: ModuleCard[] = [
    {
      icon: '⏱️',
      titleKey: 'landing.modules.time_tracking_title',
      descKey: 'landing.modules.time_tracking_desc',
      tagKey: 'landing.modules.time_tracking_tag',
      featured: true,
    },
    {
      icon: '🍽️',
      titleKey: 'landing.modules.orders_title',
      descKey: 'landing.modules.orders_desc',
      tagKey: 'landing.modules.orders_tag',
      featured: false,
    },
    {
      icon: '📦',
      titleKey: 'landing.modules.inventory_title',
      descKey: 'landing.modules.inventory_desc',
      tagKey: 'landing.modules.inventory_tag',
      featured: false,
    },
  ];

  protected readonly steps: Step[] = [
    { titleKey: 'landing.how.step1_title', descKey: 'landing.how.step1_desc' },
    { titleKey: 'landing.how.step2_title', descKey: 'landing.how.step2_desc' },
    { titleKey: 'landing.how.step3_title', descKey: 'landing.how.step3_desc' },
  ];

  protected readonly freeFeatures = [
    'landing.pricing.free_feature1',
    'landing.pricing.free_feature2',
    'landing.pricing.free_feature3',
  ];

  protected readonly proFeatures = [
    'landing.pricing.pro_feature1',
    'landing.pricing.pro_feature2',
    'landing.pricing.pro_feature3',
    'landing.pricing.pro_feature4',
  ];
}
