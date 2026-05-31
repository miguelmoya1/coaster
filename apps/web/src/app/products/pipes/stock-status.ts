import { Pipe, PipeTransform } from '@angular/core';
import { BadgeVariant } from '../../presentation/components/badge/badge';
import { StockStatus } from '../models/product.interface';

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
      case 'ALERT':
        switch (type) {
          case 'border':
            return 'border-error';
          case 'text-color':
            return 'text-error';
          case 'bg-color':
            return 'bg-error';
          case 'label':
            return 'pantry.status.ALERT';
          case 'badge-variant':
            return 'error';
        }
        break;
      case 'WARNING':
        switch (type) {
          case 'border':
            return 'border-tertiary';
          case 'text-color':
            return 'text-tertiary';
          case 'bg-color':
            return 'bg-tertiary';
          case 'label':
            return 'pantry.status.WARNING';
          case 'badge-variant':
            return 'warning';
        }
        break;
      case 'GOOD':
        switch (type) {
          case 'border':
            return 'border-secondary';
          case 'text-color':
            return 'text-secondary';
          case 'bg-color':
            return 'bg-secondary';
          case 'label':
            return 'pantry.status.GOOD';
          case 'badge-variant':
            return 'success';
        }
        break;
    }
    return '';
  }
}
