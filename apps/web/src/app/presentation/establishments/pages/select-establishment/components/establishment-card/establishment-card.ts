import { Component, input } from '@angular/core';
import { MatCard, MatCardAvatar, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import type { Establishment } from '@coaster/common';

import { EstablishmentRoleBadge } from '../establishment-role-badge/establishment-role-badge';

@Component({
  selector: 'coaster-establishment-card',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardAvatar, EstablishmentRoleBadge],
  template: `
    <mat-card
      data-testid="establishment-card"
      class="relative overflow-hidden cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200 p-6"
    >
      <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      <mat-card-header class="flex items-center gap-5 p-0">
        <div
          mat-card-avatar
          data-testid="establishment-card-avatar"
          class="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 shadow-inner m-0!"
        ></div>
        <div class="flex flex-col py-1">
          <mat-card-title class="heading-3" data-testid="establishment-card-name">
            {{ establishment().name }}
          </mat-card-title>

          <mat-card-subtitle class="mt-1">
            <coaster-establishment-role-badge data-testid="establishment-card-role-badge" />
          </mat-card-subtitle>
        </div>
      </mat-card-header>
    </mat-card>
  `,
})
export class EstablishmentCard {
  public readonly establishment = input.required<Establishment>();
}
