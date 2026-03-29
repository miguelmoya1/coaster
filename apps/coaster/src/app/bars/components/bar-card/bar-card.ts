import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Bar } from '@coaster/interfaces';
import { StatusCard } from '../../../shared/components/status-card/status-card';
import { BarRoleBadge } from '../bar-role-badge/bar-role-badge';

@Component({
  selector: 'coaster-bar-card',
  imports: [StatusCard, BarRoleBadge],
  template: `
    <coaster-status-card
      status="primary"
      class="cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200"
    >
      <div class="flex items-center gap-5">
        <div
          class="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 shadow-inner"
        ></div>
        <div class="flex flex-col py-1">
          <h3
            class="font-bold text-lg leading-tight text-on-surface tracking-wide"
          >
            {{ bar().name }}
          </h3>
          <coaster-bar-role-badge />
        </div>
      </div>
    </coaster-status-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarCard {
  readonly bar = input.required<Bar>();
}
