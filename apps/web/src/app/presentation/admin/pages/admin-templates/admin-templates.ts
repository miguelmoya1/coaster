import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Toast } from '@coaster/core';
import { TemplatesStore } from '@coaster/templates';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TextareaInput } from '../../../components/forms/textarea-input/textarea-input';
import { Loading } from '../../../components/loading/loading';
import { STANDARD_TEMPLATES_JSON } from './admin-template.constants';

@Component({
  selector: 'coaster-admin-templates',
  imports: [FormRoot, FormField, TextareaInput, MatButton, MatIcon, Loading, TranslatePipe],
  templateUrl: './admin-templates.html',
  styleUrl: './admin-templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTemplates {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #toast = inject(Toast);
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

            this.#toast.success(this.#translate.instant('admin_templates.toasts.update_success'));
            this.#templatesStore.reloadTemplates();
            this.form.jsonContent().value.set('');
          } catch (err) {
            console.error(err);
            let errMsg = this.#translate.instant('admin_templates.toasts.update_error');
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
    this.#toast.show(this.#translate.instant('admin_templates.toasts.load_success'), 'info', 2000);
  }
}

export default AdminTemplates;
