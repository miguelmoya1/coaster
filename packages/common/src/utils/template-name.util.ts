const TEMPLATE_NAME_PREFIX = 'templates.';

/**
 * Importing a template copies the template's name verbatim, and those names are translation keys
 * rather than words. A product carrying one is only readable once translated, and renaming it would
 * strip it of the one thing that made it readable.
 */
export const isTemplateName = (name: string | undefined | null): boolean =>
  typeof name === 'string' && name.startsWith(TEMPLATE_NAME_PREFIX);
