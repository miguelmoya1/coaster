import { Component } from '@angular/core';

@Component({
  selector: 'coaster-page-container',
  template: `<ng-content />`,
  host: {
    class: 'block w-full mx-auto flex-1 min-h-0 flex flex-col max-w-7xl transition-all duration-300',
  },
})
export class PageContainer {}
