package domain

import (
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// The longest name and description a menu line keeps, as sanitise-wording.ts.
const (
	MenuMaxName        = 80
	MenuMaxDescription = 300
)

// menuSlugMaxLength is MAX_LENGTH of menu-slug.ts.
const menuSlugMaxLength = 40

// MenuWording is the name and description of a section or a line in one language.
type MenuWording struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// MenuTranslations is the wording of a section or a line, by language.
type MenuTranslations map[string]MenuWording

// Menu is an establishment's public menu as stored, with its sections and lines in order.
type Menu struct {
	ID              string
	EstablishmentID string
	Slug            string
	Name            string
	DefaultLanguage string
	Languages       []string
	PublishedAt     *Time
	UpdatedAt       Time
	Sections        []MenuSection
}

type MenuSection struct {
	Translations MenuTranslations
	Items        []MenuItem
}

type MenuItem struct {
	ProductID    *string
	Price        *int
	IsVisible    bool
	Translations MenuTranslations
	// Product is nil when the line has no product.
	Product *MenuProduct
}

// MenuProduct is what a menu line reads from its product.
type MenuProduct struct {
	Name      string
	Price     int
	ImageURL  *string
	Allergens []string
	DeletedAt *Time
	UpdatedAt Time
}

// MenuDraft is the menu as its editor sees it, MenuDraft in @coaster/common.
type MenuDraft struct {
	ID                    string             `json:"id"`
	Slug                  string             `json:"slug"`
	Name                  string             `json:"name"`
	DefaultLanguage       string             `json:"defaultLanguage"`
	Languages             []string           `json:"languages"`
	PublishedAt           *Time              `json:"publishedAt,omitempty"`
	HasUnpublishedChanges bool               `json:"hasUnpublishedChanges"`
	Sections              []MenuSectionDraft `json:"sections"`
}

type MenuSectionDraft struct {
	Translations MenuTranslations `json:"translations"`
	Items        []MenuItemDraft  `json:"items"`
}

type MenuItemDraft struct {
	ProductID    *string          `json:"productId,omitempty"`
	Price        *int             `json:"price,omitempty"`
	IsVisible    bool             `json:"isVisible"`
	Translations MenuTranslations `json:"translations"`
}

// PublishedMenu is the menu customers read in one language, PublishedMenu in @coaster/common.
type PublishedMenu struct {
	Name      string                 `json:"name"`
	Language  string                 `json:"language"`
	Languages []string               `json:"languages"`
	Sections  []PublishedMenuSection `json:"sections"`
}

type PublishedMenuSection struct {
	Name  string              `json:"name"`
	Items []PublishedMenuItem `json:"items"`
}

type PublishedMenuItem struct {
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Price       int      `json:"price"`
	ImageURL    *string  `json:"imageUrl,omitempty"`
	Allergens   []string `json:"allergens"`
	ProductID   *string  `json:"productId,omitempty"`
	// SoldOut is only set when the establishment marks what has run out.
	SoldOut *bool `json:"soldOut,omitempty"`
}

// MenuEstablishment is what starting a menu needs of its establishment.
type MenuEstablishment struct {
	Name string
	// Language is nil when the establishment has no settings.
	Language *string
}

// PublishedMenuPage is what the public route needs of a menu found by its slug.
type PublishedMenuPage struct {
	// Snapshot is nil while the menu is not published.
	Snapshot        map[string]PublishedMenu
	DefaultLanguage string
	MarkSoldOut     bool
}

// Draft is MenuMapper.toDraft.
func (m Menu) Draft() MenuDraft {
	sections := make([]MenuSectionDraft, 0, len(m.Sections))
	for _, section := range m.Sections {
		items := make([]MenuItemDraft, 0, len(section.Items))
		for _, item := range section.Items {
			items = append(items, MenuItemDraft{
				ProductID:    item.ProductID,
				Price:        item.Price,
				IsVisible:    item.IsVisible,
				Translations: nonNil(item.Translations),
			})
		}
		sections = append(sections, MenuSectionDraft{Translations: nonNil(section.Translations), Items: items})
	}

	languages := make([]string, 0, len(m.Languages))
	for _, language := range m.Languages {
		languages = append(languages, AsLanguage(language))
	}

	return MenuDraft{
		ID:                    m.ID,
		Slug:                  m.Slug,
		Name:                  m.Name,
		DefaultLanguage:       AsLanguage(m.DefaultLanguage),
		Languages:             languages,
		PublishedAt:           m.PublishedAt,
		HasUnpublishedChanges: m.HasUnpublishedChanges(),
		Sections:              sections,
	}
}

// HasUnpublishedChanges reports whether the menu, or a product on it, changed after it
// was published.
func (m Menu) HasUnpublishedChanges() bool {
	if m.PublishedAt == nil {
		return true
	}

	published := m.PublishedAt.Time
	if m.UpdatedAt.After(published) {
		return true
	}

	for _, section := range m.Sections {
		for _, item := range section.Items {
			if item.Product != nil && item.Product.UpdatedAt.After(published) {
				return true
			}
		}
	}

	return false
}

// RenderEveryLanguage is renderEveryLanguage: the published menu in each of its languages.
func (m Menu) RenderEveryLanguage() map[string]PublishedMenu {
	rendered := make(map[string]PublishedMenu, len(m.Languages))
	for _, language := range m.Languages {
		language = AsLanguage(language)
		rendered[language] = m.Render(language)
	}
	return rendered
}

// Render is renderMenu: the menu customers read in language. Hidden lines, lines without
// a name and sections left empty are dropped.
func (m Menu) Render(language string) PublishedMenu {
	fallback := AsLanguage(m.DefaultLanguage)

	languages := make([]string, 0, len(m.Languages))
	for _, lang := range m.Languages {
		languages = append(languages, AsLanguage(lang))
	}

	sections := []PublishedMenuSection{}
	for _, section := range m.Sections {
		if rendered, ok := renderSection(section, language, fallback); ok {
			sections = append(sections, rendered)
		}
	}

	return PublishedMenu{Name: m.Name, Language: language, Languages: languages, Sections: sections}
}

func renderSection(section MenuSection, language, fallback string) (PublishedMenuSection, bool) {
	wording, _ := wordingFor(section.Translations, language, fallback)
	name := strings.TrimSpace(wording.Name)

	items := []PublishedMenuItem{}
	for _, item := range section.Items {
		if rendered, ok := renderItem(item, language, fallback); ok {
			items = append(items, rendered)
		}
	}

	if name == "" || len(items) == 0 {
		return PublishedMenuSection{}, false
	}

	return PublishedMenuSection{Name: name, Items: items}, true
}

func renderItem(item MenuItem, language, fallback string) (PublishedMenuItem, bool) {
	// A product that was deleted counts as no product.
	product := item.Product
	if product != nil && product.DeletedAt != nil {
		product = nil
	}

	wording, _ := wordingFor(item.Translations, language, fallback)
	name := strings.TrimSpace(wording.Name)
	if name == "" && product != nil {
		name = product.Name
	}

	if name == "" || !item.IsVisible {
		return PublishedMenuItem{}, false
	}

	rendered := PublishedMenuItem{
		Name:        name,
		Description: strings.TrimSpace(wording.Description),
		Allergens:   []string{},
		ProductID:   item.ProductID,
	}

	switch {
	case item.Price != nil:
		rendered.Price = *item.Price
	case product != nil:
		rendered.Price = product.Price
	}

	if product != nil {
		rendered.ImageURL = product.ImageURL
		if product.Allergens != nil {
			rendered.Allergens = product.Allergens
		}
	}

	return rendered, true
}

// wordingFor is the wording in language, or in fallback when there is none in language.
func wordingFor(translations MenuTranslations, language, fallback string) (MenuWording, bool) {
	if wording, ok := translations[language]; ok {
		return wording, true
	}
	wording, ok := translations[fallback]
	return wording, ok
}

func nonNil(translations MenuTranslations) MenuTranslations {
	if translations == nil {
		return MenuTranslations{}
	}
	return translations
}

// SanitiseTranslations is sanitiseTranslations: it keeps the offered languages, and in each
// a trimmed name and description cut to their maximum length. Anything else is dropped.
func SanitiseTranslations(translations map[string]any, offered []string) MenuTranslations {
	cleaned := MenuTranslations{}

	for language, value := range translations {
		if !IsLanguage(language) || !slices.Contains(offered, language) {
			continue
		}

		fields, ok := value.(map[string]any)
		if !ok {
			continue
		}

		wording := MenuWording{
			Name:        cleanText(fields["name"], MenuMaxName),
			Description: cleanText(fields["description"], MenuMaxDescription),
		}
		if wording.Name != "" || wording.Description != "" {
			cleaned[language] = wording
		}
	}

	return cleaned
}

// cleanText trims a string and cuts it to max characters; anything else becomes "".
func cleanText(value any, max int) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}

	runes := []rune(strings.TrimSpace(text))
	if len(runes) > max {
		runes = runes[:max]
	}
	return string(runes)
}

var (
	notSlugCharacters = regexp.MustCompile(`[^a-z0-9]+`)
	accentFolds       = buildAccentFolds()
)

// Slugify is slugify of menu-slug.ts: letters without accents, lower case, and dashes
// for everything else, at most 40 characters.
func Slugify(name string) string {
	var folded strings.Builder
	for _, r := range name {
		if base, ok := accentFolds[r]; ok {
			folded.WriteRune(base)
			continue
		}
		folded.WriteRune(r)
	}

	slug := notSlugCharacters.ReplaceAllString(strings.ToLower(folded.String()), "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > menuSlugMaxLength {
		slug = slug[:menuSlugMaxLength]
	}
	return strings.TrimRight(slug, "-")
}

// NextMenuSlug is nextSlug: the slug of base, or with -2, -3… when it is taken.
func NextMenuSlug(base string, taken []string) string {
	root := Slugify(base)
	if root == "" {
		root = "menu"
	}

	if !slices.Contains(taken, root) {
		return root
	}

	for suffix := 2; ; suffix++ {
		candidate := root + "-" + strconv.Itoa(suffix)
		if !slices.Contains(taken, candidate) {
			return candidate
		}
	}
}

// buildAccentFolds maps each Latin letter with a diacritic to its base letter, which is what
// Nest gets by normalising to NFD and dropping the combining marks.
func buildAccentFolds() map[rune]rune {
	letters := map[rune]string{
		'a': "àáâãäåāăąÀÁÂÃÄÅĀĂĄ",
		'c': "çćĉċčÇĆĈĊČ",
		'd': "ďĎ",
		'e': "èéêëēĕėęěÈÉÊËĒĔĖĘĚ",
		'g': "ĝğġģĜĞĠĢ",
		'h': "ĥĤ",
		'i': "ìíîïĩīĭįÌÍÎÏĨĪĬĮİ",
		'j': "ĵĴ",
		'k': "ķĶ",
		'l': "ĺļľĹĻĽ",
		'n': "ñńņňÑŃŅŇ",
		'o': "òóôõöōŏőÒÓÔÕÖŌŎŐ",
		'r': "ŕŗřŔŖŘ",
		's': "śŝşšŚŜŞŠ",
		't': "ţťŢŤ",
		'u': "ùúûüũūŭůűųÙÚÛÜŨŪŬŮŰŲ",
		'w': "ŵŴ",
		'y': "ýÿŷÝŶŸ",
		'z': "źżžŹŻŽ",
	}

	folds := make(map[rune]rune)
	for base, accented := range letters {
		for _, r := range accented {
			folds[r] = base
		}
	}
	return folds
}
