import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Bar } from '@coaster/common';
import { MatCard, MatCardContent } from '@angular/material/card';

import { BarRoleBadge } from '../bar-role-badge/bar-role-badge';

@Component({
  selector: 'coaster-bar-card',
  imports: [MatCard, MatCardContent, BarRoleBadge],
  template: `
    <mat-card class="relative overflow-hidden cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200">
      <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      <mat-card-content class="p-6 flex flex-col justify-between">
        <div class="flex items-center gap-5">
          <div
            data-testid="bar-card-avatar"
            class="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 shadow-inner"
          ></div>
          <div class="flex flex-col py-1">
            <h3 class="heading-3" data-testid="bar-card-name">
              {{ bar().name }}
            </h3>

            <coaster-bar-role-badge data-testid="bar-card-role-badge" />
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarCard {
  public readonly bar = input.required<Bar>();
}
