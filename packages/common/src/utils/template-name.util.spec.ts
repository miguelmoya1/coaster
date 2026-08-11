import { describe, expect, it } from 'vitest';
import { isTemplateName } from './template-name.util';

describe('isTemplateName', () => {
  it('should recognise a name an import copied from a template', () => {
    expect(isTemplateName('templates.products.coffee_black')).toBe(true);
    expect(isTemplateName('templates.categories.cafeteria')).toBe(true);
  });

  it('should leave a name the establishment typed alone', () => {
    expect(isTemplateName('Croquetas de la casa')).toBe(false);
    expect(isTemplateName('Templates de prueba')).toBe(false);
  });

  it('should not mistake a product merely mentioning templates for one', () => {
    expect(isTemplateName('Plantilla templates.products')).toBe(false);
  });

  it('should treat a missing name as typed rather than imported', () => {
    expect(isTemplateName(undefined)).toBe(false);
    expect(isTemplateName(null)).toBe(false);
    expect(isTemplateName('')).toBe(false);
  });
});
