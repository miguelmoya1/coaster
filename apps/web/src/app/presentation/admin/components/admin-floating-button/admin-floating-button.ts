import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'coaster-admin-floating-button',
  imports: [MatFabButton, MatIcon, CdkDrag],
  template: `
    <button mat-fab cdkDrag style="position: fixed; bottom: 5rem; left: 5rem; z-index: 9999;" (click)="navigateToAdmin()">
      <mat-icon>admin_panel_settings</mat-icon>
    </button>
  `,
  host: {
    style: 'position: absolute;',
  },
  styles: [
    `
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class AdminFloatingButton {
  readonly #router = inject(Router);

  navigateToAdmin() {
    this.#router.navigate(['/app/admin/dashboard']);
  }
}
