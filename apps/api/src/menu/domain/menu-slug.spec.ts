import { describe, expect, it } from 'vitest';
import { nextSlug, slugify } from './menu-slug';

describe('slugify', () => {
  it('should strip accents rather than drop the letters', () => {
    expect(slugify('Café Ñandú')).toBe('cafe-nandu');
  });

  it('should collapse punctuation and spacing into single dashes', () => {
    expect(slugify('  ¡¡El Rincón!!  ')).toBe('el-rincon');
  });

  it('should never end on a dash, including after the length cut', () => {
    expect(slugify('a'.repeat(39) + ' bar')).not.toMatch(/-$/);
  });

  it('should return nothing when there is nothing usable', () => {
    expect(slugify('¡¡¡---!!!')).toBe('');
  });
});

describe('nextSlug', () => {
  it('should use the name when it is free', () => {
    expect(nextSlug('Bar Pepe', [])).toBe('bar-pepe');
  });

  it('should number a name already taken', () => {
    expect(nextSlug('Bar Pepe', ['bar-pepe'])).toBe('bar-pepe-2');
    expect(nextSlug('Bar Pepe', ['bar-pepe', 'bar-pepe-2'])).toBe('bar-pepe-3');
  });

  it('should still produce something for a name with no usable characters', () => {
    expect(nextSlug('¡¡¡!!!', [])).toBe('menu');
  });
});
