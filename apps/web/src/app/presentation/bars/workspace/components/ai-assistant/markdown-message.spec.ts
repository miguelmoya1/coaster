import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownMessage } from './markdown-message';

describe('MarkdownMessage', () => {
  let fixture: ComponentFixture<MarkdownMessage>;

  const render = (content: string): HTMLElement => {
    fixture.componentRef.setInput('content', content);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.coaster-md');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownMessage] }).compileComponents();
    fixture = TestBed.createComponent(MarkdownMessage);
    fixture.componentRef.setInput('content', '');
  });

  it('should turn emphasis into real markup instead of showing the asterisks', () => {
    const host = render('Hoy llevas **340 €**, un *12%* más que ayer.');

    expect(host.querySelector('strong')?.textContent).toBe('340 €');
    expect(host.querySelector('em')?.textContent).toBe('12%');
    expect(host.textContent).not.toContain('**');
  });

  it('should render a bullet list as a list', () => {
    const host = render('Bajo mínimos:\n\n- Cerveza: 3\n- Vino: 1\n- Tónica: 2');

    expect(host.querySelectorAll('ul li')).toHaveLength(3);
    expect(host.querySelectorAll('ul li')[0].textContent).toContain('Cerveza');
  });

  it('should keep single line breaks, which is how a chat answer reads', () => {
    const host = render('Primera línea\nSegunda línea');

    expect(host.querySelectorAll('br')).toHaveLength(1);
  });

  it('should render tables and code even though the prompt discourages them', () => {
    const host = render('| A | B |\n| - | - |\n| 1 | 2 |');

    expect(host.querySelector('table')).toBeTruthy();
  });

  it('should strip a script injected through the model output', () => {
    const host = render('Hola <script>window.__pwned = true;</script> adiós');

    expect(host.querySelector('script')).toBeNull();
    expect((window as unknown as Record<string, unknown>)['__pwned']).toBeUndefined();
  });

  it('should drop event handler attributes smuggled into inline HTML', () => {
    const host = render('<img src="x" onerror="window.__pwned = true">');

    expect(host.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect((window as unknown as Record<string, unknown>)['__pwned']).toBeUndefined();
  });

  it('should survive the partial markdown that arrives mid-stream', () => {
    expect(() => render('Voy a mirarlo. **340')).not.toThrow();
    expect(() => render('- Cerveza\n- Vi')).not.toThrow();
  });

  it('should render nothing for an empty answer', () => {
    const host = render('');

    expect(host.textContent?.trim()).toBe('');
  });
});
