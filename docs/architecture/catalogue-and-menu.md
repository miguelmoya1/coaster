# The catalogue, the menu, and the languages between them

Steps 1 and 2 are built: the starter catalogue is a file, names are words, the establishment has a
language, and the menu can be written, published and read by customers. What is left is the
assistant's help with translations.

## Why the previous shape had to go

Importing a template copies the template's name verbatim, and template names are translation keys —
`templates.products.coffee_black`, not "Café solo". Three things follow, and the third is the one
that makes this a redesign rather than a patch.

1. **Only the browser could read the catalogue.** The keys lived in `apps/web/public/i18n/*.json` and
   the API has no i18n at all, so the printed ticket carried the key and the assistant was handed
   `templates.products.coffee_black` and asked to match "dos cañas" against it.
2. **The catalogue was not in the repository.** No seed, no migration, no fixture. The 83 rows existed
   because somebody pasted JSON into the admin screen, so every environment held whatever was typed
   into it, no change to it could be reviewed, and losing the database lost the catalogue.
3. **Keys were generated from data while translations lived in code.** `bulk-upsert-templates.handler`
   slugified whatever the admin typed into `templates.products.<slug>`, and the translation for that
   slug had to be hand-written into two JSON files and deployed. Nothing connected the two, so adding
   "Vermut" to the catalogue silently created a product named `templates.products.vermut`, and the
   translations test could not catch it because the key was data rather than code.

## What holds, now and for the menu

- `Product.name` holds **words**, always. That alone fixed the ticket, the assistant and the CSV.
- The establishment has a language: `EstablishmentSettings.language`, inherited from its creator.
- **No key is ever derived from a datum.**

## Three kinds of text, three owners

| Text | Whose language | Where it is decided |
| --- | --- | --- |
| Buttons, labels, errors | The user's | `UserPreferences.language`, already built |
| The starter catalogue Coaster ships | The establishment's, at import | A file in this repository |
| What the establishment sells | Its own words | Not translated; the menu carries translations |

Staff read products, and staff work in the establishment's language, so **the product itself is never
translated**. Customers read the menu, so translations belong to the menu. That split is what keeps
the internal side free of language decisions.

## The starter catalogue is a file

The two template tables, the `templates` module in the API and the admin editor are gone — roughly
1220 lines that maintained 83 rows of content. In their place,
[`starter-catalogue.ts`](../../apps/api/src/catalogue/starter-catalogue.ts): 141 lines, languages
written out, no keys and no slugs.

```ts
{
  key: 'cafeteria',
  icon: 'coffee',
  names: { es: 'Cafetería', en: 'Coffee Shop' },
  products: [{ names: { es: 'Café Solo', en: 'Black Coffee' }, price: 120 }],
}
```

Changing the catalogue is a reviewed commit rather than a paste into production. It is product
content, so a deploy is the right gate. A spec guards what a hand edit can break: every name present
in every language, unique category keys, whole positive prices, no empty category.

`GET /establishments/:id/catalogue` serves it resolved to the establishment's language, and
`POST .../catalogue/import` writes `Category.name` and `Product.name` as words. No selection means
the whole catalogue, which is what onboarding asks for; a selection names categories by key. Both are
idempotent, so importing twice adds nothing.

When the menu arrives, the same file fills a draft menu's translations at import: a bar that imports
the standard catalogue gets a menu already written in both languages for free.

## The menu is its own document

Not a view over the catalogue. The catalogue is operational and private: it holds "Barril 30L",
test products and things nobody should read. The menu is published, ordered, described and
deliberate.

```prisma
model DbMenu {
  id                String
  establishmentId   String
  slug              String  @unique
  defaultLanguage   String
  languages         String[]
  publishedSnapshot Json?
  publishedAt       DateTime?
}

model DbMenuSection {
  id           String
  menuId       String
  position     Int
  translations Json   // { "es": { "name": "Cafetería" }, "en": { ... } }
}

model DbMenuItem {
  id           String
  sectionId    String
  productId    String?  // null for something sold only on the menu
  price        Int?     // null takes the product's price
  position     Int
  translations Json     // { "es": { "name": ..., "description": ... }, ... }
}
```

**Translations are JSON, not tables.** A menu is only ever read whole, never queried by language, so
six tables would buy nothing. The editor's "what still has no English?" is
`translations->'en' IS NULL`, which Postgres answers perfectly well.

**A menu item's name starts as a copy of the product's** and is editable afterwards. Renaming a
product therefore does not rewrite a published menu, which is the entire point of publishing.

**Publishing renders the document once** into `publishedSnapshot`. The public endpoint reads that one
JSON column and picks a language: no joins, no draft leaking, and nothing to invalidate — a new
publish replaces it. This is why the menu does not need Redis to be fast.

Several menus per establishment fall out for free (breakfast, seasonal, terrace). The UI can expose
one to begin with.

**Allergens live on the product**, not the menu: they are a fact about the food. Spanish law obliges
an establishment to inform customers about the fourteen listed ones, and a published menu is where
people will look. A nullable column costs nothing now and is a migration plus a data-entry campaign
once venues have real catalogues. Whether to display them stays a switch on the menu.

## The public surface

- `GET /m/:slug?lang=` — outside every guard, and the first thing a stranger can reach, so it needs
  its own rate limit rather than the authenticated one.
- A slug, never the internal UUID, so the QR points at something printable.
- Shows section, name, description, price, image, allergens. **Never** stock, takings or staff.
- Unpublished is a 404, not an empty menu.
- Requires the `INVENTORY` module and an explicit switch: off until somebody turns it on.
- **Not ordering.** A customer ordering from the QR is a different product, with payments, fraud and
  table state in it. A menu is a menu.

## Filling in the translations an establishment writes itself

1. **Nothing** — the item falls back to its default language. Always available, and what a paper menu
   does anyway.
2. **By hand**, per language, in the menu editor, with the missing-translation query as a checklist.
3. **The assistant translates the menu in one pass.** A good fit: once per item rather than once per
   request, so a 50-item menu is about one message of the monthly allowance. It must be reviewed
   before saving — an auto-translated menu nobody read is how a dish ends up embarrassing.

The languages a menu offers are a **separate list** from the languages the app's interface has: a
coastal bar may want French on the menu without Coaster being translated into French.

## Order of work

1. ~~**Catalogue out of keys.**~~ Done. The file, `EstablishmentSettings.language`, an import that
   writes words, and a migration that rewrote the stored `templates.*` names through the same source
   the file was generated from, so a re-import matches instead of duplicating. It took with it the
   template tables, the API module, the admin screen, the `templates.*` i18n blocks and the rename
   lock those keys had needed. Allergens went in at the same time, while catalogues were still empty.
2. ~~**The menu**~~ Done. `Menu`, `MenuSection` and `MenuItem`, a draft read and replaced whole, a
   publish that renders every language into `publishedSnapshot`, and `GET /menus/:slug` outside every
   guard with its own rate limit. The editor lives under inventory; the public page at `/m/:slug`.
3. **Translation help**: the editor already counts what is unwritten; the assistant's batch pass is
   what remains.
