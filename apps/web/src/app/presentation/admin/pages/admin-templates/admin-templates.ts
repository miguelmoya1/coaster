import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Toast } from '@coaster/core';
import { CoasterBtn, Loading, SectionTitle } from '@coaster/shared';
import { TemplatesStore } from '@coaster/templates';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideArrowLeft,
  lucideCheck,
  lucideSettings,
  lucideSparkles,
  lucideUpload,
} from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';

const STANDARD_TEMPLATES_JSON = `[
  {
    "name": "Cafetería",
    "icon": "coffee",
    "products": [
      { "name": "Café Solo", "price": 120 },
      { "name": "Café con Leche", "price": 150 },
      { "name": "Capuccino", "price": 220 },
      { "name": "Infusión / Té", "price": 140 },
      { "name": "Colacao", "price": 160 },
      { "name": "Café Espresso", "price": 130 },
      { "name": "Café Cortado", "price": 140 },
      { "name": "Carajillo", "price": 250 }
    ]
  },
  {
    "name": "Refrescos y Aguas",
    "icon": "water-drop",
    "products": [
      { "name": "Agua Mineral 500ml", "price": 150 },
      { "name": "Agua con Gas", "price": 170 },
      { "name": "Coca-Cola Original", "price": 230 },
      { "name": "Coca-Cola Zero", "price": 230 },
      { "name": "Fanta Naranja", "price": 220 },
      { "name": "Fanta Limón", "price": 220 },
      { "name": "Nestea", "price": 240 },
      { "name": "Aquarius Limón", "price": 240 },
      { "name": "Sprite", "price": 230 },
      { "name": "Tónica", "price": 220 }
    ]
  },
  {
    "name": "Cervezas",
    "icon": "beer",
    "products": [
      { "name": "Caña de la Casa", "price": 200 },
      { "name": "Doble de Cerveza", "price": 280 },
      { "name": "Tercio Estrella", "price": 250 },
      { "name": "Tercio Heineken", "price": 270 },
      { "name": "Cerveza Sin Alcohol", "price": 220 },
      { "name": "Tinto de Verano", "price": 300 },
      { "name": "Cerveza Artesanal IPA", "price": 350 }
    ]
  },
  {
    "name": "Vinos y Licores",
    "icon": "wine",
    "products": [
      { "name": "Copa de Vino Tinto (Rioja)", "price": 280 },
      { "name": "Copa de Vino Blanco (Rueda)", "price": 260 },
      { "name": "Vermut", "price": 250 },
      { "name": "Gin Tonic Importación", "price": 800 },
      { "name": "Ron con Cola", "price": 700 },
      { "name": "Whisky Solo", "price": 600 },
      { "name": "Chupito de la Casa", "price": 150 }
    ]
  },
  {
    "name": "Tapas y Raciones",
    "icon": "restaurant",
    "products": [
      { "name": "Patatas Bravas", "price": 650 },
      { "name": "Ensaladilla Rusa", "price": 580 },
      { "name": "Croquetas de Jamón (6 ud)", "price": 720 },
      { "name": "Calamares a la Romana", "price": 890 },
      { "name": "Tabla de Quesos", "price": 1200 },
      { "name": "Alitas de Pollo", "price": 600 },
      { "name": "Tabla de Jamón Ibérico", "price": 1500 },
      { "name": "Pimientos del Padrón", "price": 550 }
    ]
  },
  {
    "name": "Bocadillos y Hamburguesas",
    "icon": "lunch-dining",
    "products": [
      { "name": "Bocadillo de Calamares", "price": 550 },
      { "name": "Bocadillo Chivito", "price": 620 },
      { "name": "Bocadillo Tortilla de Patatas", "price": 450 },
      { "name": "Hamburguesa Clásica con Queso", "price": 850 },
      { "name": "Hamburguesa Especial Coaster", "price": 1150 },
      { "name": "Sandwich Mixto", "price": 350 },
      { "name": "Perrito Caliente", "price": 450 }
    ]
  },
  {
    "name": "Postres",
    "icon": "cake",
    "products": [
      { "name": "Tarta de Queso", "price": 450 },
      { "name": "Tarta de Chocolate", "price": 450 },
      { "name": "Flan Casero", "price": 300 },
      { "name": "Helado Variado", "price": 350 }
    ]
  }
]`;

@Component({
  selector: 'coaster-admin-templates',
  imports: [FormsModule, SectionTitle, CoasterBtn, NgIcon, Loading],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideSettings,
      lucideUpload,
      lucideSparkles,
      lucideCheck,
      lucideAlertTriangle,
    }),
  ],
  template: `
    <div
      class="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <!-- Top header bar -->
      <div class="flex items-center justify-between border-b border-outline-variant pb-4">
        <button
          (click)="goBack()"
          class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer group"
        >
          <ng-icon name="lucideArrowLeft" class="text-xl group-hover:-translate-x-1 transition-transform" />
          <span class="font-bold text-sm tracking-wider uppercase">Volver</span>
        </button>

        <div class="flex items-center gap-2 text-primary font-black uppercase tracking-wider text-sm">
          <ng-icon name="lucideSettings" class="text-lg spin" />
          <span>Panel de Control Admin</span>
        </div>
      </div>

      <!-- Main Title -->
      <coaster-section-title
        heading="Administración de Plantillas"
        description="Gestiona, crea o sobrescribe de manera masiva las plantillas estándar del sistema que se ofrecen para importar a los nuevos locales."
        centered
        isH1
      />

      <!-- Content Editor Card -->
      <div class="bg-surface-container rounded-2xl border border-outline-variant p-6 flex flex-col gap-6 shadow-xl">
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between"
          >
            <span>Editor JSON de Plantillas</span>
            @if (validationError()) {
              <span class="text-error flex items-center gap-1">
                <ng-icon name="lucideAlertTriangle" />
                JSON Inválido
              </span>
            } @else if (jsonContent()) {
              <span class="text-success flex items-center gap-1">
                <ng-icon name="lucideCheck" />
                Formato Válido
              </span>
            }
          </label>
          <div
            class="relative w-full rounded-xl overflow-hidden border border-outline focus-within:border-primary transition-colors"
          >
            <textarea
              [(ngModel)]="jsonContent"
              (ngModelChange)="validateJson()"
              placeholder="[
  {
    'name': 'Categoría',
    'icon': 'coffee',
    'products': [
      { 'name': 'Producto', 'price': 100 }
    ]
  }
]"
              class="w-full h-80 p-4 font-mono text-sm bg-surface-container-high text-on-surface border-0 focus:outline-hidden focus:ring-0 resize-y"
            ></textarea>
          </div>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Asegúrate de que el JSON sea un array de categorías, donde cada categoría tenga un <strong>name</strong>,
            <strong>icon</strong> y una lista opcional de <strong>products</strong> (con <strong>name</strong> y
            <strong>price</strong> en céntimos).
          </p>
        </div>

        <!-- Utility prefill button -->
        <button
          coaster-btn
          variant="outline"
          (click)="loadStandardTemplates()"
          class="border-dashed border-2 border-primary/20 hover:border-primary/50 text-primary-container group"
        >
          <ng-icon name="lucideSparkles" class="text-lg group-hover:scale-110 transition-transform" />
          Cargar Plantilla Estándar del Bar
        </button>

        <!-- Submit actions -->
        <div class="flex flex-col gap-3 mt-2">
          <button
            coaster-btn
            variant="primary"
            [disabled]="isSubmitting() || !isValid()"
            (click)="upsertTemplates()"
            class="relative"
          >
            @if (isSubmitting()) {
              <coaster-loading class="scale-75" />
              <span>Procesando...</span>
            } @else {
              <ng-icon name="lucideUpload" class="text-lg" />
              <span>Upsert de Plantillas</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-height: 100vh;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .spin {
        animation: spin 8s linear infinite;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTemplates {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #toast = inject(Toast);
  readonly #templatesStore = inject(TemplatesStore);

  readonly jsonContent = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);
  readonly validationError = signal<boolean>(false);
  readonly isValid = signal<boolean>(false);

  goBack() {
    this.#router.navigate(['/bars/select']);
  }

  loadStandardTemplates() {
    this.jsonContent.set(STANDARD_TEMPLATES_JSON);
    this.validateJson();
    this.#toast.show('Plantilla estándar cargada en el editor', 'info', 2000);
  }

  validateJson() {
    const val = this.jsonContent().trim();
    if (!val) {
      this.validationError.set(false);
      this.isValid.set(false);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        throw new Error('Debe ser un array');
      }
      this.validationError.set(false);
      this.isValid.set(true);
    } catch {
      this.validationError.set(true);
      this.isValid.set(false);
    }
  }

  async upsertTemplates() {
    if (!this.isValid()) return;
    this.isSubmitting.set(true);

    try {
      const payload = JSON.parse(this.jsonContent());
      await firstValueFrom(this.#http.post('/templates/bulk', payload));

      this.#toast.success('Plantillas actualizadas con éxito');
      this.#templatesStore.reloadTemplates();
      this.jsonContent.set('');
      this.isValid.set(false);
    } catch (err) {
      console.error(err);
      let errMsg = 'Error al actualizar las plantillas. Revisa el formato JSON.';
      if (err instanceof HttpErrorResponse) {
        errMsg = err.error?.message || err.message || errMsg;
      }
      this.#toast.error(errMsg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

export default AdminTemplates;
