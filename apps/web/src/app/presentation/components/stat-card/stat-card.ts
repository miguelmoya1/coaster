import { Component, input } from '@angular/core';
import { MatCard, MatCardSubtitle, MatCardTitle } from '@angular/material/card';

type StatCardTone = 'primary' | 'secondary' | 'tertiary' | 'error';
type StatCardSize = 'default' | 'large';

@Component({
  selector: 'coaster-stat-card',
  imports: [MatCard, MatCardSubtitle, MatCardTitle],
  host: {
    class: 'block',
  },
  template: `
    <mat-card class="relative overflow-hidden p-6 flex flex-col gap-1 justify-between h-full">
      <div
        class="absolute top-0 left-0 w-1 h-full"
        [class.bg-primary]="tone() === 'primary'"
        [class.bg-secondary]="tone() === 'secondary'"
        [class.bg-tertiary]="tone() === 'tertiary'"
        [class.bg-error]="tone() === 'error'"
      ></div>
      <mat-card-subtitle class="text-sm text-on-surface-variant font-medium m-0!">
        {{ label() }}
      </mat-card-subtitle>
      <mat-card-title
        class="font-bold text-on-surface m-0!"
        [class.text-2xl]="size() === 'default'"
        [class.text-3xl]="size() === 'large'"
      >
        {{ value() }}
      </mat-card-title>
    </mat-card>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly tone = input<StatCardTone>('primary');
  readonly size = input<StatCardSize>('default');
}
