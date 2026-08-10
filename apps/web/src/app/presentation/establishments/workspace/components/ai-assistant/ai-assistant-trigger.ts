import { Component, computed, inject, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import type { EstablishmentId } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiVoiceService } from './ai-voice.service';

@Component({
  selector: 'coaster-ai-assistant-trigger',
  imports: [MatIconButton, MatIcon, TranslatePipe, RequireSubscriptionDirective],
  template: `
    <button
      mat-icon-button
      coasterRequireSubscription
      [establishmentId]="establishmentId()"
      (click)="service.toggle()"
      [attr.aria-expanded]="service.isOpen()"
      aria-haspopup="dialog"
      [attr.aria-label]="(service.isOpen() ? 'ai_voice.tooltip_close' : 'ai_voice.tooltip_open') | translate"
      [title]="(service.isOpen() ? 'ai_voice.tooltip_close' : 'ai_voice.tooltip_open') | translate"
      class="relative"
      [class.text-primary!]="service.isOpen()"
    >
      <mat-icon [class.text-primary!]="isBusy()">{{ icon() }}</mat-icon>

      @if (isBusy()) {
        <span
          class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
          [class]="service.status() === 'listening' ? 'bg-success animate-ping' : 'bg-primary animate-pulse'"
        ></span>
      }
    </button>
  `,
})
export class AiAssistantTrigger {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly service = inject(AiVoiceService);

  protected readonly isBusy = computed(
    () => this.service.status() === 'listening' || this.service.status() === 'processing',
  );

  protected readonly icon = computed(() => {
    switch (this.service.status()) {
      case 'listening':
        return 'graphic_eq';
      case 'processing':
        return 'pending';
      default:
        return 'auto_awesome';
    }
  });
}
