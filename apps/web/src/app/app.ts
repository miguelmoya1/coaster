import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { asUserId, User } from '@coaster/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('coaster');

  a: User = {
    id: asUserId('123'),
    email: '[EMAIL_ADDRESS]',
    name: 'Test',
    active: true,
  };
}
