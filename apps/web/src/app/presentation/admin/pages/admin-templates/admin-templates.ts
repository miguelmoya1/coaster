import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Toast } from '@coaster/core';
import { CoasterBtn, Loading, SectionTitle, TextareaInput } from '@coaster/shared';
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
import { STANDARD_TEMPLATES_JSON } from './admin-template.constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonArrayValidator(field: any) {
  validate(field, (ctx) => {
    const val = (ctx.value() as string | null | undefined)?.trim();
    if (!val) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        return {
          kind: 'invalid_json',
          message: 'El JSON debe ser un array de categorías',
        };
      }
      return undefined;
    } catch {
      return {
        kind: 'invalid_json',
        message: 'El JSON tiene un formato inválido',
      };
    }
  });
}

@Component({
  selector: 'coaster-admin-templates',
  imports: [FormRoot, FormField, TextareaInput, SectionTitle, CoasterBtn, NgIcon, Loading],
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
  templateUrl: './admin-templates.html',
  styleUrl: './admin-templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTemplates {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #toast = inject(Toast);
  readonly #templatesStore = inject(TemplatesStore);

  readonly placeholderText = `[
  {
    "name": "Categoría",
    "icon": "coffee",
    "products": [
      { "name": "Producto", "price": 100 }
    ]
  }
]`;

  readonly #formBase = signal<{ jsonContent: string }>({
    jsonContent: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.jsonContent);
      jsonArrayValidator(fields.jsonContent);
    },
    {
      submission: {
        action: async (form) => {
          try {
            const payload = JSON.parse(form().value().jsonContent);
            await firstValueFrom(this.#http.post('/templates/bulk', payload));

            this.#toast.success('Plantillas actualizadas con éxito');
            this.#templatesStore.reloadTemplates();
            this.form.jsonContent().value.set('');
          } catch (err) {
            console.error(err);
            let errMsg = 'Error al actualizar las plantillas. Revisa el formato JSON.';
            if (err instanceof HttpErrorResponse) {
              errMsg = err.error?.message || err.message || errMsg;
            }
            this.#toast.error(errMsg);
            return {
              kind: 'http_error',
              message: errMsg,
            };
          }
          return null;
        },
      },
    },
  );

  goBack() {
    this.#router.navigate(['/bars/select']);
  }

  loadStandardTemplates() {
    this.form.jsonContent().value.set(STANDARD_TEMPLATES_JSON);
    this.#toast.show('Plantilla estándar cargada en el editor', 'info', 2000);
  }
}

export default AdminTemplates;
