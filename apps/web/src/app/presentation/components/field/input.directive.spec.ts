import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CoasterInput } from './input.directive';

@Component({
  imports: [CoasterInput],
  template: `
    <input coasterInput data-testid="text" />
    <textarea coasterInput data-testid="area"></textarea>
    <select coasterInput data-testid="select"></select>
    <button coasterInput data-testid="button" type="button">Elegir</button>
  `,
})
class Host {}

describe('CoasterInput', () => {
  let fixture: ComponentFixture<Host>;

  const at = (testid: string): HTMLElement => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('should dress a button like every other field, so a trigger does not stand out', () => {
    expect(at('button').className).toContain('coaster-input');
    expect(at('button').className).toContain('bg-surface-container-highest');
  });

  it("should force the fill and border on a button, which Tailwind's preflight otherwise strips", () => {
    expect(at('button').className).toContain('bg-surface-container-highest!');
    expect(at('button').className).toContain('border!');
    expect(at('text').className).not.toContain('bg-surface-container-highest!');
  });

  it('should give the pointer to what is clicked', () => {
    expect(at('select').className).toContain('cursor-pointer');
    expect(at('button').className).toContain('cursor-pointer');
  });

  it('should keep the caret on what is typed into', () => {
    expect(at('text').className).toContain('cursor-text');
    expect(at('area').className).toContain('cursor-text');
    expect(at('text').className).not.toContain('cursor-pointer');
  });
});
