import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MoneyFormatterService } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

interface Highlight {
  icon: string;
  titleKey: string;
  descKey: string;
}

interface ModuleCard {
  icon: string;
  titleKey: string;
  descKey: string;
  tagKey: string;
  featured: boolean;
}

interface ComparisonRow {
  traditionalKey: string;
  coasterKey: string;
}

interface Step {
  titleKey: string;
  descKey: string;
}

interface FaqItem {
  questionKey: string;
  answerKey: string;
}

const BASE_PRICE_CENTS = 1999;
const INCLUDED_SEATS = 10;
const EXTRA_SEAT_PRICE_CENTS = 200;

@Component({
  selector: 'coaster-landing',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  host: {
    class: 'block min-h-svh bg-surface text-white selection:bg-primary/30 selection:text-primary antialiased',
  },
  template: `
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        class="absolute -top-40 -left-40 w-96 h-96 bg-radial from-primary/20 via-secondary/10 to-transparent rounded-full blur-3xl"
      ></div>
      <div
        class="absolute top-1/3 -right-40 w-96 h-96 bg-radial from-primary/15 via-transparent to-transparent rounded-full blur-3xl"
      ></div>
      <div
        class="absolute bottom-0 left-1/4 w-96 h-96 bg-radial from-secondary/10 via-transparent to-transparent rounded-full blur-3xl"
      ></div>
    </div>

    <header class="sticky top-0 z-50 backdrop-blur-xl bg-surface/85 border-b border-white/10">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <a routerLink="/" class="flex items-center gap-2.5 min-w-0">
          <img
            src="logo.webp"
            alt=""
            width="36"
            height="36"
            fetchpriority="high"
            class="h-9 w-9 shrink-0"
          />
          <span class="font-black tracking-tight text-xl sm:text-2xl truncate">Coaster</span>
        </a>

        <nav class="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          <a href="#modulos" class="hover:text-primary transition-colors">{{ 'landing.nav.modules' | translate }}</a>
          <a href="#ventajas" class="hover:text-primary transition-colors">{{ 'landing.nav.advantages' | translate }}</a>
          <a href="#como-funciona" class="hover:text-primary transition-colors">
            {{ 'landing.nav.how_it_is' | translate }}
          </a>
          <a href="#precios" class="hover:text-primary transition-colors">{{ 'landing.nav.pricing' | translate }}</a>
          <a href="#faq" class="hover:text-primary transition-colors">{{ 'landing.nav.faq' | translate }}</a>
        </nav>

        <a
          mat-flat-button
          routerLink="/login"
          class="bg-primary! text-black! font-bold! rounded-xl! shrink-0 px-4! sm:px-6! shadow-md hover:brightness-110 transition-all"
        >
          {{ 'landing.nav.try_free' | translate }}
        </a>
      </div>
    </header>

    <main class="relative z-10">
      <!-- Hero -->
      <section class="mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 text-center">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary shadow-xs"
        >
          {{ 'landing.hero.badge' | translate }}
        </span>

        <h1 class="mt-6 text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
          {{ 'landing.hero.title_main' | translate }}
          <span class="block mt-1 bg-linear-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
            {{ 'landing.hero.title_gradient' | translate }}
          </span>
        </h1>

        <p class="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          {{ 'landing.hero.subtitle' | translate }}
        </p>

        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <a
            mat-flat-button
            routerLink="/login"
            class="w-full sm:w-auto bg-primary! text-black! font-bold! rounded-xl! px-8! py-3.5! text-base! shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            {{ 'landing.hero.cta_primary' | translate }}
          </a>
          <a
            href="#precios"
            mat-stroked-button
            class="w-full sm:w-auto rounded-xl! px-8! py-3.5! border-white/20! text-white! hover:bg-white/5 transition-colors"
          >
            {{ 'landing.hero.cta_secondary' | translate }}
          </a>
        </div>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span class="flex items-center gap-1.5">
            <span class="text-primary font-bold">✓</span> {{ 'landing.hero.badge_no_card' | translate }}
          </span>
          <span class="hidden sm:inline text-white/20">·</span>
          <span class="flex items-center gap-1.5">
            <span class="text-primary font-bold">✓</span> {{ 'landing.hero.badge_quick_setup' | translate }}
          </span>
          <span class="hidden sm:inline text-white/20">·</span>
          <span class="flex items-center gap-1.5">
            <span class="text-primary font-bold">✓</span> {{ 'landing.hero.badge_cancel' | translate }}
          </span>
        </div>
      </section>

      <!-- Highlights / Trust bar -->
      <section class="mx-auto max-w-6xl px-4 sm:px-6 pb-20 sm:pb-24">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of highlights; track item.titleKey) {
            <article
              class="rounded-2xl border border-white/10 bg-surface-container-low/70 p-5 flex flex-col gap-2.5 backdrop-blur-xs transition-colors hover:border-white/20"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl" aria-hidden="true">{{ item.icon }}</span>
                <h3 class="font-bold text-sm text-white">{{ item.titleKey | translate }}</h3>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">{{ item.descKey | translate }}</p>
            </article>
          }
        </div>
      </section>

      <!-- Modules -->
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

          <div class="mt-10 grid gap-5 sm:grid-cols-3">
            @for (card of moduleCards; track card.titleKey) {
              <article
                class="rounded-2xl border p-6 flex flex-col gap-4 relative transition-all duration-300 hover:translate-y-[-2px]"
                [class]="card.featured ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-3xl" aria-hidden="true">{{ card.icon }}</span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                    [class]="card.featured ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/10 text-slate-300'"
                  >
                    {{ card.tagKey | translate }}
                  </span>
                </div>

                <div>
                  <h3 class="font-bold text-lg text-white">{{ card.titleKey | translate }}</h3>
                  <p class="mt-2 text-sm text-slate-300 leading-relaxed">{{ card.descKey | translate }}</p>
                </div>
              </article>
            }
          </div>
        </div>
      </section>

      <!-- Comparison (Why Coaster) -->
      <section id="ventajas" class="border-t border-white/10 py-20 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <header class="text-center max-w-2xl mx-auto">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.comparison.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
              {{ 'landing.comparison.title' | translate }}
            </h2>
            <p class="mt-3 text-slate-300">{{ 'landing.comparison.subtitle' | translate }}</p>
          </header>

          <div class="mt-12 grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            <!-- Traditional -->
            <div class="rounded-2xl border border-white/10 bg-surface-container-low/30 p-6 sm:p-8 flex flex-col gap-5">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full bg-error/70" aria-hidden="true"></span>
                <h3 class="font-bold text-base sm:text-lg text-slate-300">
                  {{ 'landing.comparison.col_traditional' | translate }}
                </h3>
              </div>
              <ul class="flex flex-col gap-4 text-sm text-slate-400">
                @for (row of comparisons; track row.traditionalKey) {
                  <li class="flex items-start gap-3">
                    <span class="text-error font-bold text-base leading-none mt-0.5 shrink-0" aria-hidden="true">✕</span>
                    <span>{{ row.traditionalKey | translate }}</span>
                  </li>
                }
              </ul>
            </div>

            <!-- Coaster -->
            <div class="rounded-2xl border border-primary/50 bg-primary/[0.07] p-6 sm:p-8 flex flex-col gap-5 relative shadow-xl shadow-primary/5">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" aria-hidden="true"></span>
                <h3 class="font-bold text-base sm:text-lg text-white">
                  {{ 'landing.comparison.col_coaster' | translate }}
                </h3>
              </div>
              <ul class="flex flex-col gap-4 text-sm text-slate-200">
                @for (row of comparisons; track row.coasterKey) {
                  <li class="flex items-start gap-3">
                    <span class="text-primary font-bold text-base leading-none mt-0.5 shrink-0" aria-hidden="true">✓</span>
                    <span>{{ row.coasterKey | translate }}</span>
                  </li>
                }
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section id="como-funciona" class="border-t border-white/10 bg-surface-container-low/40 py-20 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <header class="max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.how.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">{{ 'landing.how.title' | translate }}</h2>
          </header>

          <ol class="mt-10 grid gap-6 sm:grid-cols-3">
            @for (step of steps; track step.titleKey; let i = $index) {
              <li class="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-3">
                <span
                  class="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center font-black text-sm border border-primary/30"
                  aria-hidden="true"
                >
                  {{ i + 1 }}
                </span>
                <h3 class="font-bold text-lg text-white">{{ step.titleKey | translate }}</h3>
                <p class="text-sm text-slate-300 leading-relaxed">{{ step.descKey | translate }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Pricing -->
      <section id="precios" class="border-t border-white/10 py-20 sm:py-24">
        <div class="mx-auto max-w-2xl px-4 sm:px-6">
          <header class="text-center">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.pricing.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
              {{ 'landing.pricing.title' | translate }}
            </h2>
            <p class="mt-3 text-slate-300">{{ 'landing.pricing.subtitle' | translate }}</p>
          </header>

          <article class="mt-10 rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:p-8 flex flex-col gap-6 shadow-xl shadow-primary/5">
            <div class="flex flex-col gap-2">
              <span
                class="self-start rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black"
              >
                {{ 'landing.pricing.trial_badge' | translate }}
              </span>
              <h3 class="font-bold text-xl text-white">{{ 'landing.pricing.trial_title' | translate }}</h3>
              <p class="text-sm text-slate-300 leading-relaxed">{{ 'landing.pricing.trial_desc' | translate }}</p>
            </div>

            <div class="border-t border-white/10 pt-6 flex flex-col gap-2">
              <div class="flex items-baseline gap-2 flex-wrap">
                <span class="text-sm text-slate-400">{{ 'landing.pricing.then' | translate }}</span>
                <span class="text-4xl sm:text-5xl font-black tabular-nums text-primary">
                  {{ 'landing.pricing.price' | translate }}
                </span>
                <span class="text-sm text-slate-400">{{ 'landing.pricing.period' | translate }}</span>
                <span class="text-sm font-semibold text-slate-300">{{ 'landing.pricing.tax' | translate }}</span>
              </div>

              <p class="text-sm font-semibold text-white">{{ 'landing.pricing.included_seats' | translate }}</p>
              <p class="text-xs text-slate-400">{{ 'landing.pricing.price_note' | translate }}</p>
            </div>

            <div class="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col gap-2">
              <p class="text-sm font-semibold text-white">{{ 'landing.pricing.extra_title' | translate }}</p>
              <p class="text-sm text-slate-300 leading-relaxed">{{ 'landing.pricing.extra_desc' | translate }}</p>

              <table class="mt-2 w-full text-sm tabular-nums">
                <caption class="sr-only">{{ 'landing.pricing.extra_table_caption' | translate }}</caption>
                <thead>
                  <tr class="text-xs uppercase tracking-wide text-slate-400">
                    <th scope="col" class="text-left font-semibold py-1">
                      {{ 'landing.pricing.extra_col_staff' | translate }}
                    </th>
                    <th scope="col" class="text-right font-semibold py-1">
                      {{ 'landing.pricing.extra_col_price' | translate }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of priceExamples; track row.staff) {
                    <tr class="border-t border-white/5">
                      <th scope="row" class="text-left font-normal text-slate-300 py-2">
                        {{ 'landing.pricing.extra_row_staff' | translate: { count: row.staff } }}
                      </th>
                      <td class="text-right font-semibold text-white py-2">{{ row.price }}</td>
                    </tr>
                  }
                </tbody>
              </table>

              <p class="text-xs text-slate-400 mt-1">{{ 'landing.pricing.extra_note' | translate }}</p>
            </div>

            <ul class="flex flex-col gap-3 text-sm text-slate-300">
              @for (feature of planFeatures; track feature) {
                <li class="flex items-start gap-2.5">
                  <span class="text-primary font-bold leading-none mt-0.5" aria-hidden="true">✓</span>
                  <span>{{ feature | translate }}</span>
                </li>
              }
            </ul>

            <a
              mat-flat-button
              routerLink="/login"
              class="bg-primary! text-black! font-bold! rounded-xl! py-3.5! text-base! shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
            >
              {{ 'landing.pricing.cta' | translate }}
            </a>
          </article>

          <p class="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            {{ 'landing.pricing.note' | translate }}
          </p>
        </div>
      </section>

      <!-- FAQ Section -->
      <section id="faq" class="border-t border-white/10 bg-surface-container-low/40 py-20 sm:py-24">
        <div class="mx-auto max-w-3xl px-4 sm:px-6">
          <header class="text-center">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.faq.tag' | translate }}
            </span>
            <h2 class="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
              {{ 'landing.faq.title' | translate }}
            </h2>
            <p class="mt-3 text-slate-300">{{ 'landing.faq.subtitle' | translate }}</p>
          </header>

          <div class="mt-10 flex flex-col gap-3">
            @for (faq of faqItems; track faq.questionKey) {
              <details class="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors open:border-primary/40 open:bg-primary/[0.03]">
                <summary class="flex cursor-pointer items-center justify-between font-bold text-base sm:text-lg text-white list-none select-none">
                  <span>{{ faq.questionKey | translate }}</span>
                  <span class="ml-4 text-primary transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                    ↓
                  </span>
                </summary>
                <p class="mt-3 text-sm text-slate-300 leading-relaxed">
                  {{ faq.answerKey | translate }}
                </p>
              </details>
            }
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="border-t border-white/10 py-20 sm:py-28 relative overflow-hidden">
        <div class="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {{ 'landing.cta.title' | translate }}
          </h2>
          <p class="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            {{ 'landing.cta.subtitle' | translate }}
          </p>

          <a
            mat-flat-button
            routerLink="/login"
            class="mt-8 bg-primary! text-black! font-bold! rounded-xl! px-9! py-4! text-base! shadow-xl shadow-primary/25 hover:scale-105 transition-transform"
          >
            {{ 'landing.cta.button' | translate }}
          </a>
        </div>
      </section>
    </main>

    <footer class="relative z-10 border-t border-white/10 py-10">
      <div
        class="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400"
      >
        <div class="flex items-center gap-2">
          <img src="logo.webp" alt="" width="24" height="24" class="h-6 w-6 opacity-75" />
          <p>{{ 'landing.footer.tagline' | translate }}</p>
        </div>
        <p>© {{ year }} Coaster. {{ 'landing.footer.rights' | translate }}</p>
      </div>
    </footer>
  `,
})
export default class Landing {
  protected readonly year = new Date().getFullYear();

  protected readonly highlights: Highlight[] = [
    {
      icon: '🛡️',
      titleKey: 'landing.highlights.legal_title',
      descKey: 'landing.highlights.legal_desc',
    },
    {
      icon: '📱',
      titleKey: 'landing.highlights.hardware_title',
      descKey: 'landing.highlights.hardware_desc',
    },
    {
      icon: '⚡',
      titleKey: 'landing.highlights.speed_title',
      descKey: 'landing.highlights.speed_desc',
    },
    {
      icon: '🧩',
      titleKey: 'landing.highlights.modular_title',
      descKey: 'landing.highlights.modular_desc',
    },
  ];

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

  protected readonly comparisons: ComparisonRow[] = [
    {
      traditionalKey: 'landing.comparison.trad_1',
      coasterKey: 'landing.comparison.coaster_1',
    },
    {
      traditionalKey: 'landing.comparison.trad_2',
      coasterKey: 'landing.comparison.coaster_2',
    },
    {
      traditionalKey: 'landing.comparison.trad_3',
      coasterKey: 'landing.comparison.coaster_3',
    },
    {
      traditionalKey: 'landing.comparison.trad_4',
      coasterKey: 'landing.comparison.coaster_4',
    },
  ];

  protected readonly steps: Step[] = [
    { titleKey: 'landing.how.step1_title', descKey: 'landing.how.step1_desc' },
    { titleKey: 'landing.how.step2_title', descKey: 'landing.how.step2_desc' },
    { titleKey: 'landing.how.step3_title', descKey: 'landing.how.step3_desc' },
  ];

  readonly #money = inject(MoneyFormatterService);

  protected readonly priceExamples = [5, 10, 12, 20].map((staff) => ({
    staff,
    price: this.#money.format(BASE_PRICE_CENTS + Math.max(0, staff - INCLUDED_SEATS) * EXTRA_SEAT_PRICE_CENTS),
  }));

  protected readonly planFeatures = [
    'landing.pricing.feature1',
    'landing.pricing.feature2',
    'landing.pricing.feature3',
    'landing.pricing.feature4',
  ];

  protected readonly faqItems: FaqItem[] = [
    { questionKey: 'landing.faq.q1', answerKey: 'landing.faq.a1' },
    { questionKey: 'landing.faq.q2', answerKey: 'landing.faq.a2' },
    { questionKey: 'landing.faq.q3', answerKey: 'landing.faq.a3' },
    { questionKey: 'landing.faq.q4', answerKey: 'landing.faq.a4' },
    { questionKey: 'landing.faq.q5', answerKey: 'landing.faq.a5' },
  ];
}
