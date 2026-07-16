import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'coaster-landing',
  imports: [RouterLink, MatButtonModule],
  host: {
    class:
      'block min-h-svh bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_35%),radial-gradient(circle_at_bottom_right,#bfdbfe,transparent_40%),linear-gradient(160deg,#fff7ed_0%,#ffffff_55%,#eff6ff_100%)]',
  },
  template: `
    <main class="mx-auto max-w-6xl px-6 py-8 sm:py-16">
      <header class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-black text-white grid place-items-center font-black">C</div>
          <p class="font-black tracking-tight text-xl">Coaster</p>
        </div>

        <a mat-stroked-button routerLink="/app/login">Entrar</a>
      </header>

      <section class="mt-16 sm:mt-24 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p class="uppercase tracking-[0.2em] text-xs font-bold text-slate-600">SaaS para hosteleria</p>
          <h1 class="mt-4 text-4xl sm:text-6xl font-black tracking-tight leading-[0.95] text-slate-900">
            Tu bar, en piloto automatico
          </h1>
          <p class="mt-6 text-slate-700 text-lg leading-relaxed max-w-xl">
            Gestiona sala, pedidos, turnos y caja en una sola app. Escala con planes de suscripcion y facturacion
            integrada para crecer sin friccion.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <a mat-flat-button routerLink="/app/login" class="!rounded-full !px-6 !py-6">Probar Coaster</a>
            <a mat-button routerLink="/app/login" class="!rounded-full !px-6 !py-6">Ver demo</a>
          </div>
        </div>

        <div
          class="rounded-3xl border border-slate-200/70 bg-white/80 backdrop-blur p-6 sm:p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,.45)]"
        >
          <p class="text-sm font-semibold text-slate-500">Plan recomendado</p>
          <h2 class="mt-2 text-3xl font-black text-slate-900">Barra Pro</h2>
          <p class="mt-1 text-slate-600">29 EUR/mes</p>

          <ul class="mt-6 space-y-3 text-slate-700">
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span
              ><span>Pedidos, mesas y caja en tiempo real</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span><span>Panel de equipo y turnos</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span
              ><span>Facturas y metodos de pago en Stripe</span>
            </li>
          </ul>

          <a mat-flat-button routerLink="/app/login" class="!mt-8 !w-full !rounded-xl !py-6">Empezar ahora</a>
        </div>
      </section>
    </main>
  `,
})
export default class Landing {}
