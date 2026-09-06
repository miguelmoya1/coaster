import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NoteEditor } from './note-editor';

describe('NoteEditor', () => {
  let fixture: ComponentFixture<NoteEditor>;
  let emitted: string[];

  const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  const toggle = () => query('[data-testid="note-editor-toggle"]');
  const input = () => query('[data-testid="note-editor-input"]') as HTMLInputElement | null;

  const type = (text: string) => {
    input()!.value = text;
    input()!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const press = (key: string) => {
    input()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NoteEditor] }).compileComponents();

    fixture = TestBed.createComponent(NoteEditor);
    emitted = [];
    fixture.componentInstance.notesChanged.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('placeholder', 'Añadir nota');
    fixture.detectChanges();
  });

  it('should offer the placeholder when there is no note yet', () => {
    expect(toggle()?.textContent).toContain('Añadir nota');
    expect(input()).toBeNull();
  });

  it('should open the editor focused on the current note', () => {
    fixture.componentRef.setInput('notes', 'sin hielo');
    fixture.detectChanges();

    toggle()!.click();
    fixture.detectChanges();

    expect(input()?.value).toBe('sin hielo');
    expect(document.activeElement).toBe(input());
  });

  it('should save on enter', () => {
    toggle()!.click();
    fixture.detectChanges();
    type('sin hielo');
    press('Enter');

    expect(emitted).toEqual(['sin hielo']);
    expect(input()).toBeNull();
  });

  it('should save when the field loses focus', () => {
    toggle()!.click();
    fixture.detectChanges();
    type('con limón');
    input()!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(emitted).toEqual(['con limón']);
  });

  it('should not save twice when enter is followed by a blur', () => {
    toggle()!.click();
    fixture.detectChanges();
    type('sin hielo');
    press('Enter');
    fixture.componentInstance['commit']();

    expect(emitted).toEqual(['sin hielo']);
  });

  it('should stay quiet when the text did not change', () => {
    fixture.componentRef.setInput('notes', 'sin hielo');
    fixture.detectChanges();
    toggle()!.click();
    fixture.detectChanges();
    press('Enter');

    expect(emitted).toEqual([]);
  });

  it('should discard the draft on escape', () => {
    toggle()!.click();
    fixture.detectChanges();
    type('me equivoqué');
    press('Escape');

    expect(emitted).toEqual([]);
    expect(input()).toBeNull();
  });

  it('should show a closed order note as plain text', () => {
    fixture.componentRef.setInput('notes', 'sin hielo');
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();

    expect(toggle()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('sin hielo');
  });

  it('should show nothing at all when there is no note and no editing allowed', () => {
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
