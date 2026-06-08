import { Component, input } from '@angular/core';
import type { Bar } from '@coaster/common';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardAvatar } from '@angular/material/card';

import { BarRoleBadge } from '../bar-role-badge/bar-role-badge';

@Component({
  selector: 'coaster-bar-card',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardAvatar, BarRoleBadge],
  template: `
    <mat-card class="relative overflow-hidden cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200 p-6">
      <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      <mat-card-header class="flex items-center gap-5 p-0">
        <div
          mat-card-avatar
          data-testid="bar-card-avatar"
          class="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 shadow-inner m-0!"
        ></div>
        <div class="flex flex-col py-1">
          <mat-card-title class="heading-3" data-testid="bar-card-name">
            {{ bar().name }}
          </mat-card-title>

          <mat-card-subtitle class="mt-1">
            <coaster-bar-role-badge data-testid="bar-card-role-badge" />
          </mat-card-subtitle>
        </div>
      </mat-card-header>
    </mat-card>
  `,
  })
export class BarCard {
  public readonly bar = input.required<Bar>();
}
