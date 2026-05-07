import { Pipe, PipeTransform } from '@angular/core';
import { StockStatus } from '@coaster/common';
import { BadgeVariant } from '../../shared';

@Pipe({
  name: 'stockStatus',
  standalone: true,
})
export class StockStatusPipe implements PipeTransform {
  transform(status: StockStatus, type: 'badge-variant'): BadgeVariant;
  transform(status: StockStatus, type: 'border' | 'text-color' | 'bg-color' | 'label'): string;
  transform(
    status: StockStatus,
    type: 'border' | 'text-color' | 'bg-color' | 'label' | 'badge-variant',
  ): string | BadgeVariant {
    switch (status) {
      case 'critical':
        switch (type) {
          case 'border':
            return 'border-error';
          case 'text-color':
            return 'text-error';
          case 'bg-color':
            return 'bg-error';
          case 'label':
            return 'Critical';
          case 'badge-variant':
            return 'error';
        }
        break;
      case 'low':
        switch (type) {
          case 'border':
            return 'border-tertiary';
          case 'text-color':
            return 'text-tertiary';
          case 'bg-color':
            return 'bg-tertiary';
          case 'label':
            return 'Low Stock';
          case 'badge-variant':
            return 'warning';
        }
        break;
      case 'good':
        switch (type) {
          case 'border':
            return 'border-secondary';
          case 'text-color':
            return 'text-secondary';
          case 'bg-color':
            return 'bg-secondary';
          case 'label':
            return 'Good';
          case 'badge-variant':
            return 'success';
        }
        break;
    }
    return '';
  }
}
