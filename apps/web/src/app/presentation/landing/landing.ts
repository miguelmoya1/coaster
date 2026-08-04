import { afterNextRender, Component, ElementRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface FaqKeyItem {
  questionKey: string;
  answerKey: string;
}

@Component({
  selector: 'coaster-landing',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  host: {
    class: 'block min-h-svh bg-surface text-white selection:bg-primary/30 selection:text-primary font-sans antialiased',
  },
  template: `
    <!-- Background Aura Accents -->
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        class="absolute -top-40 -left-40 w-96 h-96 sm:w-lg sm:h-lg bg-radial from-primary/15 via-secondary/5 to-transparent rounded-full blur-3xl"
      ></div>
      <div
        class="absolute top-1/3 -right-40 w-96 h-96 sm:w-lg sm:h-lg bg-radial from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl"
      ></div>
      <div
        class="absolute -bottom-40 left-1/4 w-96 h-96 sm:w-lg sm:h-lg bg-radial from-primary/10 via-transparent to-transparent rounded-full blur-3xl"
      ></div>
    </div>

    <!-- Sticky Navigation Header -->
    <header
      class="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/10 transition-all duration-300"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <!-- Logo -->
        <a
          routerLink="/"
          class="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-1"
        >
          <div
            class="h-10 w-10 rounded-xl bg-linear-to-tr from-primary to-secondary text-black grid place-items-center font-black text-xl shadow-lg group-hover:scale-105 transition-transform duration-300"
          >
            C
          </div>
          <span class="font-black tracking-tight text-2xl text-white">Coaster</span>
        </a>

        <!-- Desktop Navigation Menu -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#que-hace" class="hover:text-primary transition-colors">{{
            'landing.nav.what_it_does' | translate
          }}</a>
          <a href="#para-que-sirve" class="hover:text-primary transition-colors">{{
            'landing.nav.what_is_it_for' | translate
          }}</a>
          <a href="#precios" class="hover:text-primary transition-colors">{{ 'landing.nav.pricing' | translate }}</a>
          <a href="#faq" class="hover:text-primary transition-colors">{{ 'landing.nav.faq' | translate }}</a>
        </nav>

        <!-- Header Action -->
        <div class="flex items-center gap-3">
          <a
            mat-flat-button
            routerLink="/login"
            class="bg-primary! text-black! font-bold! rounded-xl! px-6! py-2.5! hover:bg-primary-container! transition-all"
          >
            {{ 'landing.nav.try_free' | translate }}
          </a>
        </div>
      </div>
    </header>

    <main class="relative z-10">
      <!-- HERO SECTION -->
      <section class="relative pt-16 pb-20 lg:pt-28 lg:pb-32 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-4xl mx-auto reveal-on-scroll">
          <div
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary mb-8 shadow-inner"
          >
            <span class="material-symbols-outlined text-base">bolt</span>
            <span>{{ 'landing.hero.badge' | translate }}</span>
          </div>

          <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            {{ 'landing.hero.title_main' | translate }}<br />
            <span class="bg-linear-to-r from-primary via-secondary to-yellow-400 bg-clip-text text-transparent">
              {{ 'landing.hero.title_gradient' | translate }}
            </span>
          </h1>

          <p class="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {{ 'landing.hero.subtitle' | translate }}
          </p>

          <!-- CTAs -->
          <div class="mt-10 flex items-center justify-center gap-4">
            <a
              mat-flat-button
              routerLink="/login"
              class="bg-primary! text-black! font-extrabold! text-base! rounded-2xl! px-8! py-7! hover:bg-primary-container! hover:scale-105 transition-all"
            >
              <span class="flex items-center gap-2">
                <span>{{ 'landing.hero.cta_primary' | translate }}</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </span>
            </a>
          </div>

          <!-- Trust Badges -->
          <div class="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
              <span>{{ 'landing.hero.badge_no_card' | translate }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
              <span>{{ 'landing.hero.badge_quick_setup' | translate }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
              <span>{{ 'landing.hero.badge_forever_free' | translate }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 1: ¿QUÉ HACE LA APLICACIÓN? (FEATURES GRID) -->
      <section id="que-hace" class="py-24 border-t border-white/10 bg-surface-container-low relative">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto reveal-on-scroll">
            <h2 class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.what_it_does.tag' | translate }}
            </h2>
            <p class="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">
              {{ 'landing.what_it_does.title' | translate }}
            </p>
            <p class="mt-4 text-slate-400 text-base sm:text-lg">
              {{ 'landing.what_it_does.subtitle' | translate }}
            </p>
          </div>

          <div class="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 text-primary grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">point_of_sale</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature1_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature1_desc' | translate }}
              </p>
            </div>

            <!-- Feature 2 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-secondary/10 border border-secondary/30 text-secondary grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">table_bar</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature2_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature2_desc' | translate }}
              </p>
            </div>

            <!-- Feature 3 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">print</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature3_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature3_desc' | translate }}
              </p>
            </div>

            <!-- Feature 4 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">inventory_2</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature4_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature4_desc' | translate }}
              </p>
            </div>

            <!-- Feature 5 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">badge</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature5_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature5_desc' | translate }}
              </p>
            </div>

            <!-- Feature 6 -->
            <div
              class="p-8 rounded-3xl bg-surface-container border border-white/10 hover:border-primary/40 transition-all duration-300 group reveal-on-scroll"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 grid place-items-center group-hover:scale-110 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">query_stats</span>
              </div>
              <h3 class="mt-6 text-xl font-bold text-white">{{ 'landing.what_it_does.feature6_title' | translate }}</h3>
              <p class="mt-3 text-slate-400 text-sm leading-relaxed">
                {{ 'landing.what_it_does.feature6_desc' | translate }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 2: ¿PARA QUÉ SIRVE? (BEFORE VS AFTER & USE CASES) -->
      <section id="para-que-sirve" class="py-24 relative">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto reveal-on-scroll">
            <h2 class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.use_cases.tag' | translate }}
            </h2>
            <p class="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">
              {{ 'landing.use_cases.title' | translate }}
            </p>
            <p class="mt-4 text-slate-400 text-base sm:text-lg">
              {{ 'landing.use_cases.subtitle' | translate }}
            </p>
          </div>

          <!-- Side-by-side comparison -->
          <div class="mt-16 grid lg:grid-cols-2 gap-8 reveal-on-scroll">
            <!-- Traditional Method -->
            <div class="p-8 sm:p-10 rounded-3xl bg-red-500/5 border border-red-500/20 relative overflow-hidden">
              <div class="flex items-center gap-3 text-red-400 font-bold text-lg mb-6">
                <span class="material-symbols-outlined text-2xl">cancel</span>
                <span>{{ 'landing.use_cases.without_title' | translate }}</span>
              </div>
              <ul class="space-y-4 text-slate-300 text-sm">
                <li class="flex items-start gap-3">
                  <span class="text-red-400 font-bold">•</span>
                  <span>{{ 'landing.use_cases.without_item1' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-400 font-bold">•</span>
                  <span>{{ 'landing.use_cases.without_item2' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-400 font-bold">•</span>
                  <span>{{ 'landing.use_cases.without_item3' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-400 font-bold">•</span>
                  <span>{{ 'landing.use_cases.without_item4' | translate }}</span>
                </li>
              </ul>
            </div>

            <!-- With Coaster -->
            <div
              class="p-8 sm:p-10 rounded-3xl bg-emerald-500/5 border border-emerald-500/30 relative overflow-hidden shadow-lg"
            >
              <div class="flex items-center gap-3 text-emerald-400 font-bold text-lg mb-6">
                <span class="material-symbols-outlined text-2xl">check_circle</span>
                <span>{{ 'landing.use_cases.with_title' | translate }}</span>
              </div>
              <ul class="space-y-4 text-slate-200 text-sm">
                <li class="flex items-start gap-3">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span>{{ 'landing.use_cases.with_item1' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span>{{ 'landing.use_cases.with_item2' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span>{{ 'landing.use_cases.with_item3' | translate }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span>{{ 'landing.use_cases.with_item4' | translate }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Business Profiles Grid -->
          <div class="mt-16 grid md:grid-cols-3 gap-6">
            <div class="p-6 rounded-2xl bg-surface-container border border-white/10 reveal-on-scroll">
              <div class="text-3xl mb-4">🍷</div>
              <h4 class="font-bold text-white text-lg">{{ 'landing.use_cases.bars_title' | translate }}</h4>
              <p class="mt-2 text-slate-400 text-xs leading-relaxed">
                {{ 'landing.use_cases.bars_desc' | translate }}
              </p>
            </div>

            <div class="p-6 rounded-2xl bg-surface-container border border-white/10 reveal-on-scroll">
              <div class="text-3xl mb-4">🍔</div>
              <h4 class="font-bold text-white text-lg">{{ 'landing.use_cases.restaurants_title' | translate }}</h4>
              <p class="mt-2 text-slate-400 text-xs leading-relaxed">
                {{ 'landing.use_cases.restaurants_desc' | translate }}
              </p>
            </div>

            <div class="p-6 rounded-2xl bg-surface-container border border-white/10 reveal-on-scroll">
              <div class="text-3xl mb-4">☕</div>
              <h4 class="font-bold text-white text-lg">{{ 'landing.use_cases.cafes_title' | translate }}</h4>
              <p class="mt-2 text-slate-400 text-xs leading-relaxed">
                {{ 'landing.use_cases.cafes_desc' | translate }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 3: PLANES DE PAGO Y VERSIÓN FREE (PRICING & PLANS) -->
      <section id="precios" class="py-24 border-t border-white/10 bg-surface-container-low relative">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto reveal-on-scroll">
            <h2 class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.pricing.tag' | translate }}
            </h2>
            <p class="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">
              {{ 'landing.pricing.title' | translate }}
            </p>
            <p class="mt-4 text-slate-400 text-base sm:text-lg">
              {{ 'landing.pricing.subtitle' | translate }}
            </p>

            <div class="mt-10 inline-flex items-center rounded-2xl bg-surface-container border border-white/10 px-6 py-3">
              <span class="text-primary font-bold">{{ 'landing.pricing.monthly' | translate }}</span>
            </div>
          </div>

          <!-- Pricing Cards Container (2 Plans: FREE vs PRO) -->
          <div class="mt-16 grid md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
            <!-- PLAN FREE -->
            <div
              class="p-8 sm:p-10 rounded-3xl bg-surface-container border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all reveal-on-scroll"
            >
              <div>
                <div class="flex items-center justify-between">
                  <h3 class="text-2xl font-black text-white">{{ 'landing.pricing.free_title' | translate }}</h3>
                  <span class="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold">{{
                    'landing.pricing.free_badge' | translate
                  }}</span>
                </div>
                <p class="mt-2 text-slate-400 text-xs leading-relaxed">
                  {{ 'landing.pricing.free_desc' | translate }}
                </p>

                <div class="mt-6 flex items-baseline gap-1">
                  <span class="text-5xl font-black text-white font-mono">{{
                    'landing.pricing.free_price' | translate
                  }}</span>
                  <span class="text-slate-400 text-sm">{{ 'landing.pricing.free_period' | translate }}</span>
                </div>
                <p class="text-xs text-emerald-400 font-semibold mt-1">
                  {{ 'landing.pricing.free_subtext' | translate }}
                </p>

                <ul class="mt-8 space-y-3.5 text-sm text-slate-300">
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-lg">check</span>
                    <span>{{ 'landing.pricing.free_feature1' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-lg">check</span>
                    <span>{{ 'landing.pricing.free_feature2' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-lg">check</span>
                    <span>{{ 'landing.pricing.free_feature3' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-lg">check</span>
                    <span>{{ 'landing.pricing.free_feature4' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-lg">check</span>
                    <span>{{ 'landing.pricing.free_feature5' | translate }}</span>
                  </li>
                </ul>
              </div>

              <div class="mt-10">
                <a
                  mat-outlined-button
                  routerLink="/login"
                  class="w-full! border-white/20! text-white! font-bold! rounded-xl! py-6! hover:bg-white/5! transition-all"
                >
                  {{ 'landing.pricing.free_cta' | translate }}
                </a>
              </div>
            </div>

            <!-- PLAN PRO (FEATURED) -->
            <div
              class="p-8 sm:p-10 rounded-3xl bg-surface-container border-2 border-primary flex flex-col justify-between relative shadow-xl reveal-on-scroll"
            >
              <div
                class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-primary to-secondary text-black text-xs font-black uppercase tracking-wider shadow-md whitespace-nowrap"
              >
                {{ 'landing.pricing.pro_badge' | translate }}
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <h3 class="text-2xl font-black text-white">{{ 'landing.pricing.pro_title' | translate }}</h3>
                  <span class="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">{{
                    'landing.pricing.pro_tag' | translate
                  }}</span>
                </div>
                <p class="mt-2 text-slate-300 text-xs leading-relaxed">
                  {{ 'landing.pricing.pro_desc' | translate }}
                </p>

                <div class="mt-6 flex items-baseline gap-1">
                  <span class="text-5xl font-black text-white font-mono">
                    {{ 'landing.pricing.pro_price_monthly' | translate }}
                  </span>
                  <span class="text-slate-400 text-sm">{{ 'landing.pricing.free_period' | translate }}</span>
                </div>
                <p class="text-xs text-secondary font-semibold mt-1">
                  {{ 'landing.pricing.pro_subtext_monthly' | translate }}
                </p>

                <ul class="mt-8 space-y-3.5 text-sm text-slate-200">
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span class="font-bold text-white">{{ 'landing.pricing.pro_feature1' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature2' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature3' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature4' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature5' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature6' | translate }}</span>
                  </li>
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-lg font-bold">check_circle</span>
                    <span>{{ 'landing.pricing.pro_feature7' | translate }}</span>
                  </li>
                </ul>
              </div>

              <div class="mt-10">
                <a
                  mat-flat-button
                  routerLink="/login"
                  class="w-full! bg-primary! text-black! font-extrabold! rounded-xl! py-6! hover:bg-primary-container! hover:scale-[1.02] transition-all"
                >
                  {{ 'landing.pricing.pro_cta' | translate }}
                </a>
              </div>
            </div>
          </div>

          <!-- COMPARISON TABLE BREAKDOWN -->
          <div
            class="mt-20 overflow-x-auto rounded-2xl border border-white/10 bg-surface-container max-w-4xl mx-auto reveal-on-scroll"
          >
            <table class="w-full text-left text-sm text-slate-300">
              <thead
                class="bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10"
              >
                <tr>
                  <th class="p-4 sm:p-6">{{ 'landing.pricing.table_feature_header' | translate }}</th>
                  <th class="p-4 sm:p-6 text-center">{{ 'landing.pricing.table_free_header' | translate }}</th>
                  <th class="p-4 sm:p-6 text-center text-primary">
                    {{ 'landing.pricing.table_pro_header' | translate }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr>
                  <td class="p-4 sm:p-6 font-semibold text-white">{{ 'landing.pricing.table_orders' | translate }}</td>
                  <td class="p-4 sm:p-6 text-center">{{ 'landing.pricing.table_orders_free' | translate }}</td>
                  <td class="p-4 sm:p-6 text-center font-bold text-emerald-400">
                    {{ 'landing.pricing.table_orders_pro' | translate }}
                  </td>
                </tr>
                <tr>
                  <td class="p-4 sm:p-6 font-semibold text-white">
                    {{ 'landing.pricing.table_printers' | translate }}
                  </td>
                  <td class="p-4 sm:p-6 text-center">{{ 'landing.pricing.table_printers_free' | translate }}</td>
                  <td class="p-4 sm:p-6 text-center font-bold text-emerald-400">
                    {{ 'landing.pricing.table_printers_pro' | translate }}
                  </td>
                </tr>
                <tr>
                  <td class="p-4 sm:p-6 font-semibold text-white">
                    {{ 'landing.pricing.table_tablemap' | translate }}
                  </td>
                  <td class="p-4 sm:p-6 text-center text-emerald-400 font-bold">✓</td>
                  <td class="p-4 sm:p-6 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td class="p-4 sm:p-6 font-semibold text-white">{{ 'landing.pricing.table_shifts' | translate }}</td>
                  <td class="p-4 sm:p-6 text-center text-slate-600">—</td>
                  <td class="p-4 sm:p-6 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td class="p-4 sm:p-6 font-semibold text-white">{{ 'landing.pricing.table_billing' | translate }}</td>
                  <td class="p-4 sm:p-6 text-center text-slate-600">—</td>
                  <td class="p-4 sm:p-6 text-center text-emerald-400 font-bold">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 4: PREGUNTAS FRECUENTES (FAQ ACCORDION) -->
      <section id="faq" class="py-24 border-t border-white/10 bg-surface-container-low relative">
        <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div class="text-center reveal-on-scroll">
            <h2 class="text-xs font-bold uppercase tracking-widest text-primary">
              {{ 'landing.faq.tag' | translate }}
            </h2>
            <p class="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
              {{ 'landing.faq.title' | translate }}
            </p>
          </div>

          <div class="mt-12 space-y-4 reveal-on-scroll">
            @for (faq of faqs; track $index) {
              <div class="rounded-2xl bg-surface-container border border-white/10 overflow-hidden transition-all">
                <button
                  type="button"
                  (click)="toggleFaq($index)"
                  class="w-full p-6 text-left font-bold text-white text-base sm:text-lg flex justify-between items-center gap-4 hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{{ faq.questionKey | translate }}</span>
                  <span
                    class="material-symbols-outlined text-slate-400 transition-transform duration-300"
                    [class.rotate-180]="activeFaq() === $index"
                  >
                    expand_more
                  </span>
                </button>
                @if (activeFaq() === $index) {
                  <div class="px-6 pb-6 text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {{ faq.answerKey | translate }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- SECTION 5: FINAL CTA BANNER -->
      <section class="py-20 relative overflow-hidden">
        <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div
            class="rounded-3xl p-10 sm:p-16 bg-linear-to-r from-primary via-secondary to-yellow-400 text-black text-center relative overflow-hidden shadow-2xl reveal-on-scroll"
          >
            <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {{ 'landing.cta.title' | translate }}
            </h2>
            <p class="mt-4 text-black/80 text-base sm:text-lg font-medium max-w-xl mx-auto">
              {{ 'landing.cta.subtitle' | translate }}
            </p>

            <div class="mt-8 flex flex-wrap justify-center gap-4">
              <a
                mat-flat-button
                routerLink="/login"
                class="bg-black! text-white! font-bold! text-base! rounded-2xl! px-8! py-6! hover:scale-105! transition-transform"
              >
                {{ 'landing.cta.button' | translate }}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="border-t border-white/10 bg-surface-container-lowest py-16 text-slate-400 text-sm">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div
                class="h-9 w-9 rounded-xl bg-linear-to-tr from-primary to-secondary text-black grid place-items-center font-black"
              >
                C
              </div>
              <span class="font-black text-xl text-white">Coaster</span>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed max-w-sm">
              {{ 'landing.footer.tagline' | translate }}
            </p>
          </div>
        </div>

        <div class="pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span>&copy; {{ currentYear }} {{ 'landing.footer.copyright' | translate }}</span>
          <div class="flex items-center gap-2 text-emerald-400">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>{{ 'landing.footer.status_ok' | translate }}</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .reveal-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition:
          opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
          transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }
      .reveal-on-scroll.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
    `,
  ],
})
export default class Landing {
  private readonly elRef = inject(ElementRef);

  activeFaq = signal<number | null>(null);
  currentYear = new Date().getFullYear();

  faqs: FaqKeyItem[] = [
    { questionKey: 'landing.faq.q1', answerKey: 'landing.faq.a1' },
    { questionKey: 'landing.faq.q2', answerKey: 'landing.faq.a2' },
    { questionKey: 'landing.faq.q3', answerKey: 'landing.faq.a3' },
    { questionKey: 'landing.faq.q4', answerKey: 'landing.faq.a4' },
    { questionKey: 'landing.faq.q5', answerKey: 'landing.faq.a5' },
  ];

  constructor() {
    afterNextRender(() => {
      this.setupScrollObserver();
    });
  }

  toggleFaq(index: number) {
    this.activeFaq.update((current) => (current === index ? null : index));
  }

  private setupScrollObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      },
    );

    const elements = this.elRef.nativeElement.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el: Element) => observer.observe(el));
  }
}
