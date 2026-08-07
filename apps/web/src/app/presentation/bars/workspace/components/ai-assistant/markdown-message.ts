import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { marked } from 'marked';

/**
 * Renders the assistant's markdown answer.
 *
 * The parsed HTML goes through Angular's `[innerHTML]` binding, which sanitises it in
 * `SecurityContext.HTML` (scripts, event handlers and `javascript:` URLs are stripped). The model
 * output is never passed through `bypassSecurityTrust*`, so a prompt injection cannot execute here.
 *
 * Encapsulation is disabled because injected HTML carries no scoping attribute, so component styles
 * would never reach it. Every rule is nested under `.coaster-md` to keep it from leaking.
 */
@Component({
  selector: 'coaster-markdown-message',
  template: `<div class="coaster-md" [innerHTML]="html()"></div>`,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .coaster-md {
        font-size: 0.875rem;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .coaster-md > *:first-child {
        margin-top: 0;
      }
      .coaster-md > *:last-child {
        margin-bottom: 0;
      }

      .coaster-md p {
        margin: 0 0 0.6em;
      }

      .coaster-md strong {
        font-weight: 700;
        color: var(--color-text-main);
      }

      .coaster-md em {
        font-style: italic;
      }

      .coaster-md del {
        opacity: 0.6;
      }

      .coaster-md ul,
      .coaster-md ol {
        margin: 0 0 0.6em;
        padding-left: 1.1em;
      }

      .coaster-md ul {
        list-style: none;
        padding-left: 0.2em;
      }

      .coaster-md ul li {
        position: relative;
        padding-left: 1em;
      }

      .coaster-md ul li::before {
        content: '';
        position: absolute;
        left: 0.15em;
        top: 0.62em;
        width: 0.3em;
        height: 0.3em;
        border-radius: 9999px;
        background-color: var(--color-primary);
      }

      .coaster-md ol {
        list-style: decimal;
      }

      .coaster-md li {
        margin: 0.15em 0;
      }

      .coaster-md li > ul,
      .coaster-md li > ol {
        margin: 0.2em 0 0.2em;
      }

      .coaster-md h1,
      .coaster-md h2,
      .coaster-md h3,
      .coaster-md h4 {
        margin: 0.8em 0 0.4em;
        font-weight: 800;
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      /* The panel is narrow, so headings stay close to body size instead of shouting. */
      .coaster-md h1 {
        font-size: 1.05rem;
      }
      .coaster-md h2 {
        font-size: 1rem;
      }
      .coaster-md h3,
      .coaster-md h4 {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .coaster-md code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.8125rem;
        padding: 0.1em 0.35em;
        border-radius: 0.375rem;
        background-color: var(--color-surface-container-high);
        border: 1px solid var(--color-border-ghost);
      }

      .coaster-md pre {
        margin: 0 0 0.6em;
        padding: 0.7em 0.8em;
        border-radius: 0.75rem;
        background-color: var(--color-surface-lowest);
        border: 1px solid var(--color-border-ghost);
        overflow-x: auto;
      }

      .coaster-md pre code {
        padding: 0;
        border: 0;
        background: none;
        font-size: 0.8125rem;
      }

      .coaster-md blockquote {
        margin: 0 0 0.6em;
        padding: 0.1em 0 0.1em 0.8em;
        border-left: 2px solid var(--color-primary);
        color: var(--color-text-muted);
      }

      .coaster-md a {
        color: var(--color-primary);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .coaster-md hr {
        margin: 0.8em 0;
        border: 0;
        border-top: 1px solid var(--color-border-ghost);
      }

      /* Tables would blow the panel width open, so they scroll inside their own box. */
      .coaster-md table {
        display: block;
        width: 100%;
        overflow-x: auto;
        border-collapse: collapse;
        margin: 0 0 0.6em;
        font-size: 0.8125rem;
      }

      .coaster-md th,
      .coaster-md td {
        border: 1px solid var(--color-border-ghost);
        padding: 0.3em 0.5em;
        text-align: left;
        white-space: nowrap;
      }

      .coaster-md th {
        background-color: var(--color-surface-container-high);
        font-weight: 700;
      }
    `,
  ],
})
export class MarkdownMessage {
  public readonly content = input.required<string>();

  protected readonly html = computed(() =>
    marked.parse(this.content() ?? '', { async: false, gfm: true, breaks: true }),
  );
}
