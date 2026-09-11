import { Component, input } from '@angular/core';

/*
 * El gestor de contraseñas del navegador necesita saber a qué cuenta pertenece la
 * contraseña que se está guardando; sin un campo de usuario ofrece «guardar» pero no
 * «actualizar». Va oculto a la vista pero renderizado: con display:none muchos
 * gestores lo ignoran.
 */
@Component({
  selector: 'coaster-username-hint',
  host: { class: 'contents' },
  template: `
    <input
      type="text"
      autocomplete="username"
      tabindex="-1"
      aria-hidden="true"
      readonly
      class="sr-only"
      data-testid="username-hint"
      [value]="email()"
    />
  `,
})
export class UsernameHint {
  public readonly email = input.required<string>();
}
