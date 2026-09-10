import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PasswordReveal } from './password-reveal';

@Component({
  imports: [PasswordReveal],
  template: `
    <coaster-password-reveal>
      <input type="password" data-testid="pw" value="la-secreta" />
    </coaster-password-reveal>
  `,
})
class Host {}

describe('PasswordReveal', () => {
  let fixture: ComponentFixture<Host>;

  const input = () => fixture.nativeElement.querySelector('[data-testid="pw"]') as HTMLInputElement;
  const button = () => fixture.nativeElement.querySelector('[data-testid="password-reveal-btn"]') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('should keep the password hidden until asked', () => {
    expect(input().type).toBe('password');
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('should reveal it and say so to a screen reader', () => {
    button().click();
    fixture.detectChanges();

    expect(input().type).toBe('text');
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('should hide it again on a second press', () => {
    button().click();
    fixture.detectChanges();
    button().click();
    fixture.detectChanges();

    expect(input().type).toBe('password');
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('should leave room for the button so the text never runs under it', () => {
    expect(input().classList.contains('pr-11!')).toBe(true);
  });

  it('should never change the value it is showing', () => {
    button().click();
    fixture.detectChanges();

    expect(input().value).toBe('la-secreta');
  });
});
