import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucidePlusCircle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '../../../shared/components/button/button';
import { SectionTitle } from '../../../shared/components/section-title/section-title';
import { StatusCard } from '../../../shared/components/status-card/status-card';

@Component({
  selector: 'coaster-select-bar',
  imports: [SectionTitle, StatusCard, TranslatePipe, Button],
  providers: [provideIcons({ lucidePlusCircle })],
  template: `
    <div
      class="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <coaster-section-title
        [heading]="'bars.select.title' | translate"
        [description]="'bars.select.subtitle' | translate"
        [centered]="true"
        [isH1]="true"
        class="mb-6"
      />

      <div class="flex flex-col gap-4">
        @for (bar of bars; track bar.id) {
          <coaster-status-card
            status="primary"
            class="cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200"
            (click)="selectBar(bar.id)"
          >
            <div class="flex items-center gap-5">
              <div
                class="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 shadow-inner"
              >
                <img
                  [src]="bar.image"
                  [alt]="bar.name"
                  class="w-full h-full object-cover opacity-80"
                />
              </div>
              <div class="flex flex-col py-1">
                <h3
                  class="font-bold text-lg leading-tight text-on-surface tracking-wide"
                >
                  {{ bar.name }}
                </h3>
                <div class="flex items-center gap-2 mt-2">
                  <div
                    class="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]"
                  ></div>
                  <span
                    class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold"
                    >{{ 'bars.select.operational' | translate }}</span
                  >
                </div>
              </div>
            </div>
          </coaster-status-card>
        } @empty {
          <div class="flex flex-col items-center justify-center p-8 bg-surface-container rounded-xl border border-dashed border-outline-variant text-center gap-3">
            <span class="text-on-surface-variant font-medium">{{ 'bars.select.empty' | translate }}</span>
          </div>
        }

        <coaster-button
          variant="dashed"
          icon="lucidePlusCircle"
          iconPos="left"
          (click)="navigateToCreate()"
          customClass="mt-2"
        >
          {{ 'bars.select.create_btn' | translate }}
        </coaster-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectBar {
  private router = inject(Router);

  readonly bars: any[] = [
    // {
    //   id: 'velvet-lounge',
    //   name: 'The Velvet Lounge',
    //   image:
    //     'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=200&h=200',
    // },
    // {
    //   id: 'cyber-tavern',
    //   name: 'Cyber Tavern',
    //   image:
    //     'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=200&h=200',
    // },
    // {
    //   id: 'neon-district',
    //   name: 'Neon District',
    //   image:
    //     'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80&w=200&h=200',
    // },
  ];

  navigateToCreate() {
    this.router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    console.log('Selected bar:', id);
    // Real implementation would set the active bar in a state management service
  }
}
