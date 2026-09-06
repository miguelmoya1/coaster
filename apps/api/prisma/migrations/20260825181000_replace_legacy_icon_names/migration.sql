-- Antes de usar Material Symbols los iconos se nombraban a mano ('beer', 'wine').
-- Parecen válidos pero no existen en el set, así que la fuente los pinta como texto.
UPDATE "Category" SET "icon" = v.icon
FROM (VALUES
  ('beer', 'sports_bar'),
  ('wine', 'wine_bar'),
  ('water-drop', 'water_drop'),
  ('lunch-dining', 'lunch_dining'),
  ('local-bar', 'local_bar'),
  ('local-cafe', 'local_cafe')
) AS v(legacy, icon)
WHERE "Category"."icon" = v.legacy;

UPDATE "Product" SET "icon" = v.icon
FROM (VALUES
  ('beer', 'sports_bar'),
  ('wine', 'wine_bar'),
  ('water-drop', 'water_drop'),
  ('lunch-dining', 'lunch_dining'),
  ('local-bar', 'local_bar'),
  ('local-cafe', 'local_cafe')
) AS v(legacy, icon)
WHERE "Product"."icon" = v.legacy;
