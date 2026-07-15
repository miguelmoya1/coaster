import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { ActionFeedback } from '@coaster/core';
import { TemplatesStore } from '@coaster/templates';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Loading } from '../../../components/loading/loading';
import { STANDARD_TEMPLATES_JSON } from './admin-template.constants';

@Component({
  selector: 'coaster-admin-templates',
  imports: [FormRoot, FormField, MatFormField, MatInput, MatButton, MatIcon, Loading, TranslatePipe],
  host: {
    class:
      'w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  templateUrl: './admin-templates.html',
  styleUrl: './admin-templates.css',
})
export class AdminTemplates {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #feedback = inject(ActionFeedback);
  readonly #templatesStore = inject(TemplatesStore);
  readonly #translate = inject(TranslateService);

  readonly #formBase = signal<{ jsonContent: string }>({
    jsonContent: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.jsonContent);
      validate(fields.jsonContent, (ctx) => {
        const rawVal = ctx.value();
        if (typeof rawVal !== 'string') {
          return undefined;
        }
        const val = rawVal.trim();
        if (!val) {
          return undefined;
        }
        try {
          const parsed = JSON.parse(val);
          if (!Array.isArray(parsed)) {
            return {
              kind: 'invalid_json',
              message: this.#translate.instant('admin_templates.validator.invalid_array'),
            };
          }
          return undefined;
        } catch {
          return {
            kind: 'invalid_json',
            message: this.#translate.instant('admin_templates.validator.invalid_format'),
          };
        }
      });
    },
    {
      submission: {
        action: async (form) => {
          try {
            const payload = JSON.parse(form().value().jsonContent);
            await firstValueFrom(this.#http.post('/templates/bulk', payload));

            this.#feedback.success(this.#translate.instant('admin_templates.toasts.update_success'));
            this.#templatesStore.reloadTemplates();
            this.form.jsonContent().value.set('');
          } catch (err) {
            let errMsg = this.#translate.instant('admin_templates.toasts.update_error');
            if (err instanceof HttpErrorResponse) {
              errMsg = err.error?.message || err.message || errMsg;
            }
            this.#feedback.error(errMsg);
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
    this.#router.navigate(['/admin/dashboard']);
  }

  loadStandardTemplates() {
    this.form.jsonContent().value.set(STANDARD_TEMPLATES_JSON);
    this.#feedback.info(this.#translate.instant('admin_templates.toasts.load_success'), 2000);
  }
}

export default AdminTemplates;
