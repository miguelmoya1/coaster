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

| Text                                | Whose language                 | Where it is decided                           |
| ----------------------------------- | ------------------------------ | --------------------------------------------- |
| Buttons, labels, errors             | The user's                     | `UserPreferences.language`, already built     |
| The starter catalogue Coaster ships | The establishment's, at import | A file in this repository                     |
| What the establishment sells        | Its own words                  | Not translated; the menu carries translations |

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
  taxRate: 1000,
  names: { es: 'Cafetería', en: 'Coffee Shop' },
  products: [{ names: { es: 'Café Solo', en: 'Black Coffee' }, price: 120, icon: 'coffee' }],
}
```

A category declares the tax rate its products inherit, in whole basis points, and a product only
carries one of its own when it genuinely differs. Nothing in the starter catalogue does today: in
hostelería the rate follows the service, not the product.

Icons are **Material Symbols names**, which is why the spec pins their shape: they are ligatures, so
`water-drop` renders nothing at all where `water_drop` renders a drop, and a name the font does not
know is painted as its own text. Four of the seven categories carried a name that did not exist
before this was checked against the published set.

The picker offers **the whole Material set**, not a curated shortlist. A hand-picked list of sixteen
sounds tidy and is not: a venue whose category is "Refrescos y Aguas" ends up choosing a wine glass
because nothing closer was on offer. The names ship as `material-icon-names.ts`, which the component
pulls in with a dynamic `import()` the first time the panel opens — so the 4226 names are their own
lazy chunk (~17 kB transferred) rather than weight every screen pays for. Without a search term the
panel shows the trade-relevant icons; with one it filters the lot and caps the grid, because a wall
of four thousand glyphs is not browsable and refining the search is.

The screens fall back in this order: **the venue's own photo, then the icon, then nothing.** The icon
is what a freshly imported catalogue has and the photo is what a venue uploads later, so a new bar
gets a legible till on day one without hotlinking anybody's product photography — a URL imported
into every venue's rows cannot be fixed centrally once it rots.

Changing the catalogue is a reviewed commit rather than a paste into production. It is product
content, so a deploy is the right gate. A spec guards what a hand edit can break: every name present
in every language, unique category keys, whole positive prices, no empty category, an icon on
everything and shaped the way Material Symbols names are, and a tax bracket that actually carries a
rate.

`GET /establishments/:id/catalogue` serves it resolved to the establishment's language, and
`POST .../catalogue/import` writes `Category.name` and `Product.name` as words. No selection means
the whole catalogue, which is what onboarding asks for; a selection names categories by key. Both are
idempotent, so importing twice adds nothing.

The plan was for the same file to fill a draft menu's translations at import — a venue that imports
the standard catalogue would get a menu already written in both languages for free. **That has not
been built**: `ImportStarterCatalogueHandler` writes categories and products and stops there, so an
establishment that imported the catalogue still starts its menu empty. The languages are sitting in
the file; nothing reads them for the menu yet.

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
people will look. `Product.allergens` is an array of the `Allergen` enum, added while catalogues were
still empty precisely so it would never need a data-entry campaign. Whether to display them stays a
switch on the menu.

## The public surface

- `GET /api/v1/menus/:slug?lang=` — outside every guard, and the first thing a stranger can reach,
  so it carries its own rate limit (60/minute) rather than the authenticated one. The page a customer
  scans is the Angular route `/m/:slug`, which reads it. A spec asserts the controller has no guards,
  so it cannot acquire one by accident either.
- A slug, never the internal UUID, so the QR points at something printable.
- Shows section, name, description, price, image, allergens. **Never** stock, takings or staff.
- Unpublished is a 404, not an empty menu — publishing **is** the switch, and unpublishing takes it
  back off without deleting the draft.
- The editor requires the `INVENTORY` module (`@RequiresModule`) and `establishment:manage-menu`,
  which is a MANAGER permission. The public read requires neither, by definition.
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
   what remains. The starter catalogue seeding a draft menu (step 2's free lunch) did not ship with
   the menu either, and belongs here — it is the same problem answered from a file instead of a
   model.
