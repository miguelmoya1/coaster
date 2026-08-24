import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTableForm } from './create-table-form';

describe('CreateTableForm', () => {
  let fixture: ComponentFixture<CreateTableForm>;
  let created: string[];

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;

  const pressEnter = () => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTableForm],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTableForm);
    created = [];
    fixture.componentInstance.created.subscribe((name) => created.push(name));
    fixture.detectChanges();
  });

  it('should create the table when the keyboard send key is pressed', () => {
    input().value = 'Mesa 7';
    pressEnter();

    expect(created).toEqual(['Mesa 7']);
  });

  it('should tell the keyboard that enter sends', () => {
    expect(input().getAttribute('enterkeyhint')).toBe('send');
  });

  it('should ignore enter on a blank name', () => {
    input().value = '   ';
    pressEnter();

    expect(created).toEqual([]);
  });

  it('should ignore enter while a table is already being created', () => {
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    input().value = 'Mesa 7';
    pressEnter();

    expect(created).toEqual([]);
  });
});
