# The catalogue, the menu, and the languages between them

A design, not a description: none of this is built. It replaces the way template names work today and
adds the customer-facing menu.

## Why the current shape has to go

Importing a template copies the template's name verbatim, and template names are translation keys —
`templates.products.coffee_black`, not "Café solo". Three things follow, and the third is the one
that makes this a redesign rather than a patch.

1. **Only the browser can read the catalogue.** The keys live in `apps/web/public/i18n/*.json` and
   the API has no i18n at all. The printed ticket carried the key until it was patched on the way
   out; the assistant is still handed `templates.products.coffee_black` and asked to match "dos
   cañas" against it.
2. **The catalogue is not in the repository.** No seed, no migration, no fixture. The 83 rows exist
   because somebody pasted JSON into the admin screen, so every environment holds whatever was typed
   into it, no change to it can be reviewed, and losing the database loses the catalogue.
3. **Keys are generated from data while translations live in code.** `bulk-upsert-templates.handler`
   slugifies whatever the admin types into `templates.products.<slug>`. The translation for that slug
   has to be hand-written into two JSON files and deployed. Nothing connects the two, so adding
   "Vermut" to the catalogue silently creates a product named `templates.products.vermut`, and the
   translations test cannot catch it because the key is data rather than code.

## What is true regardless

- `Product.name` holds **words**, always. That alone fixes the ticket, the assistant and the CSV.
- The establishment has a language: `EstablishmentSettings.language`.
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

The two template tables, the `templates` module in the API and the admin editor all go — roughly 1220
lines maintaining 83 rows of content. In their place, a versioned file with the languages written
out, no keys and no slugs:

```json
[{ "icon": "coffee",
   "names": { "es": "Cafetería", "en": "Coffee" },
   "products": [{ "names": { "es": "Café solo", "en": "Black coffee" },
                  "price": 130, "allergens": [] }] }]
```

Changing the catalogue becomes a reviewed commit rather than a paste into production. It is product
content, so a deploy is the right gate.

Importing writes `Category.name` and `Product.name` in the establishment's language, and — because
the file carries the other languages too — fills the menu draft's translations at the same time. A
bar that imports the standard catalogue gets a menu already written in both languages for free.

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

1. **Catalogue out of keys.** The file, `EstablishmentSettings.language`, import writing words, and a
   migration mapping the existing `templates.*` names through the file. Deletes the template tables,
   the API module, the admin screen, the `templates.*` i18n blocks, and — with words in the column —
   `isTemplateName`, the rename lock and `PRODUCT_NAME_FROM_TEMPLATE`.
2. **The menu**: model, editor, publish, public route. Ships without Redis thanks to the snapshot.
3. **Translation help**: the checklist, then the assistant's batch pass.

Step 1 pays for itself alone: it is what stops the assistant reading keys.
