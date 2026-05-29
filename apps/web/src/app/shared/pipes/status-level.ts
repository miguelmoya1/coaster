import { Pipe, PipeTransform } from '@angular/core';
import { StatusLevel } from '../components/status-card/status-card';

@Pipe({
  name: 'statusLevelColor',
})
export class StatusLevelColorPipe implements PipeTransform {
  transform(status: StatusLevel): string {
    switch (status) {
      case 'error':
        return 'bg-error';
      case 'warning':
        return 'bg-tertiary';
      case 'success':
        return 'bg-secondary';
      case 'primary':
        return 'bg-primary';
      default:
        return '';
    }
  }
}
