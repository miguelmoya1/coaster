const MAX_LENGTH = 40;

export const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');

export const nextSlug = (base: string, taken: string[]): string => {
  const root = slugify(base) || 'menu';
  const used = new Set(taken);

  if (!used.has(root)) {
    return root;
  }

  for (let suffix = 2; ; suffix++) {
    const candidate = `${root}-${suffix}`;

    if (!used.has(candidate)) {
      return candidate;
    }
  }
};
