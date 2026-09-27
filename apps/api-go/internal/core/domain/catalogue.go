package domain

// StarterCatalogueProduct is a product of the starter catalogue in one language.
type StarterCatalogueProduct struct {
	Name    string `json:"name"`
	Price   int    `json:"price"`
	Icon    string `json:"icon"`
	TaxRate *int   `json:"taxRate,omitempty"`
}

// StarterCatalogueCategory is a category of the starter catalogue in one language, as
// StarterCatalogueCategory in @coaster/common.
type StarterCatalogueCategory struct {
	Key      string                    `json:"key"`
	Name     string                    `json:"name"`
	Icon     *string                   `json:"icon,omitempty"`
	TaxRate  int                       `json:"taxRate"`
	Products []StarterCatalogueProduct `json:"products"`
}

// CatalogueCategoryName is a category found by its name while importing.
type CatalogueCategoryName struct {
	ID   string
	Name string
}

// CatalogueProductName is a product already in one of the imported categories.
type CatalogueProductName struct {
	CategoryID string
	Name       string
}

// NewCatalogueCategory is a category of the starter catalogue to create.
type NewCatalogueCategory struct {
	Name    string
	Icon    *string
	TaxRate int
}

// ResolveCatalogue is resolveCatalogue: the whole starter catalogue in language.
func ResolveCatalogue(language string) []StarterCatalogueCategory {
	categories := make([]StarterCatalogueCategory, 0, len(starterCatalogue))
	for _, category := range starterCatalogue {
		categories = append(categories, category.in(language))
	}
	return categories
}

// ResolveCategories is resolveCategories: the categories with those keys, in catalogue
// order, or the whole catalogue when keys is empty.
func ResolveCategories(keys []string, language string) []StarterCatalogueCategory {
	if len(keys) == 0 {
		return ResolveCatalogue(language)
	}

	wanted := make(map[string]bool, len(keys))
	for _, key := range keys {
		wanted[key] = true
	}

	var categories []StarterCatalogueCategory
	for _, category := range starterCatalogue {
		if wanted[category.key] {
			categories = append(categories, category.in(language))
		}
	}
	return categories
}

type starterProduct struct {
	names   map[string]string
	price   int
	icon    string
	taxRate *int
}

type starterCategory struct {
	key      string
	icon     string
	taxRate  int
	names    map[string]string
	products []starterProduct
}

func (c starterCategory) in(language string) StarterCatalogueCategory {
	icon := c.icon
	products := make([]StarterCatalogueProduct, 0, len(c.products))
	for _, product := range c.products {
		products = append(products, StarterCatalogueProduct{
			Name:    wordFor(product.names, language),
			Price:   product.price,
			Icon:    product.icon,
			TaxRate: product.taxRate,
		})
	}

	return StarterCatalogueCategory{
		Key:      c.key,
		Name:     wordFor(c.names, language),
		Icon:     &icon,
		TaxRate:  c.taxRate,
		Products: products,
	}
}

// wordFor is the name in language, or in DefaultLanguage when it has none.
func wordFor(names map[string]string, language string) string {
	if name := names[language]; name != "" {
		return name
	}
	return names[DefaultLanguage]
}

// starterCatalogue is STARTER_CATALOGUE of catalogue/starter-catalogue.ts.
var starterCatalogue = []starterCategory{
	{
		key:     "cafeteria",
		icon:    "coffee",
		taxRate: 1000,
		names:   map[string]string{"es": "Cafetería", "en": "Coffee Shop"},
		products: []starterProduct{
			{names: map[string]string{"es": "Café Solo", "en": "Black Coffee"}, price: 120, icon: "coffee"},
			{names: map[string]string{"es": "Café Espresso", "en": "Espresso Coffee"}, price: 130, icon: "coffee"},
			{names: map[string]string{"es": "Café Cortado", "en": "Macchiato Coffee"}, price: 140, icon: "coffee"},
			{names: map[string]string{"es": "Infusión / Té", "en": "Herbal Tea / Tea"}, price: 140, icon: "emoji_food_beverage"},
			{names: map[string]string{"es": "Café con Leche", "en": "Coffee with Milk"}, price: 150, icon: "local_cafe"},
			{names: map[string]string{"es": "Colacao", "en": "Colacao Chocolate Drink"}, price: 160, icon: "local_cafe"},
			{names: map[string]string{"es": "Capuccino", "en": "Cappuccino"}, price: 220, icon: "local_cafe"},
			{names: map[string]string{"es": "Carajillo", "en": "Carajillo Coffee with Rum"}, price: 250, icon: "coffee"},
		},
	},
	{
		key:     "refrescos_y_aguas",
		icon:    "water_drop",
		taxRate: 1000,
		names:   map[string]string{"es": "Refrescos y Aguas", "en": "Soft Drinks & Water"},
		products: []starterProduct{
			{names: map[string]string{"es": "Agua Mineral 500ml", "en": "Mineral Water 500ml"}, price: 150, icon: "water_drop"},
			{names: map[string]string{"es": "Agua con Gas", "en": "Sparkling Water"}, price: 170, icon: "water_drop"},
			{names: map[string]string{"es": "Fanta Limón", "en": "Lemon Fanta"}, price: 220, icon: "local_drink"},
			{names: map[string]string{"es": "Fanta Naranja", "en": "Orange Fanta"}, price: 220, icon: "local_drink"},
			{names: map[string]string{"es": "Tónica", "en": "Tonic Water"}, price: 220, icon: "local_drink"},
			{names: map[string]string{"es": "Coca-Cola Original", "en": "Coca-Cola Original"}, price: 230, icon: "local_drink"},
			{names: map[string]string{"es": "Coca-Cola Zero", "en": "Coca-Cola Zero"}, price: 230, icon: "local_drink"},
			{names: map[string]string{"es": "Sprite", "en": "Sprite"}, price: 230, icon: "local_drink"},
			{names: map[string]string{"es": "Aquarius Limón", "en": "Lemon Aquarius"}, price: 240, icon: "local_drink"},
			{names: map[string]string{"es": "Nestea", "en": "Nestea Ice Tea"}, price: 240, icon: "emoji_food_beverage"},
		},
	},
	{
		key:     "cervezas",
		icon:    "sports_bar",
		taxRate: 1000,
		names:   map[string]string{"es": "Cervezas", "en": "Beers"},
		products: []starterProduct{
			{names: map[string]string{"es": "Caña de Cerveza (Estrella Galicia)", "en": "Draught Beer (Estrella Galicia)"}, price: 220, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Mahou 0,0 Tostada", "en": "Mahou 0.0 Toasted (Non-Alc)"}, price: 260, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Heineken 0,0", "en": "Heineken 0.0 (Non-Alc)"}, price: 270, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Mahou Cinco Estrellas", "en": "Mahou 5 Estrellas Bottle"}, price: 270, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Estrella Galicia", "en": "Estrella Galicia Bottle"}, price: 280, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Mahou Rosé", "en": "Mahou Rosé Bottle"}, price: 280, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Heineken", "en": "Heineken Bottle"}, price: 290, icon: "sports_bar"},
			{names: map[string]string{"es": "Doble de Cerveza (Estrella Galicia)", "en": "Large Draught Beer (Estrella Galicia)"}, price: 300, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio El Águila Sin Filtrar", "en": "El Águila Unfiltered Bottle"}, price: 300, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Coronita", "en": "Corona Bottle"}, price: 320, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio 1906 Reserva Especial", "en": "1906 Reserva Especial Bottle"}, price: 340, icon: "sports_bar"},
			{names: map[string]string{"es": "Tercio Alhambra Reserva 1925", "en": "Alhambra 1925 Bottle"}, price: 350, icon: "sports_bar"},
			{names: map[string]string{"es": "Tinto de Verano", "en": "Tinto de Verano (Wine & Lemon)"}, price: 350, icon: "wine_bar"},
			{names: map[string]string{"es": "Tercio Paulaner (Trigo)", "en": "Paulaner Wheat Beer Bottle"}, price: 450, icon: "sports_bar"},
		},
	},
	{
		key:     "vinos_y_licores",
		icon:    "wine_bar",
		taxRate: 1000,
		names:   map[string]string{"es": "Vinos y Licores", "en": "Wines & Spirits"},
		products: []starterProduct{
			{names: map[string]string{"es": "Chupito de Licor de Hierbas", "en": "Herbal Liqueur Shot"}, price: 200, icon: "liquor"},
			{names: map[string]string{"es": "Chupito de Jägermeister", "en": "Jägermeister Shot"}, price: 250, icon: "liquor"},
			{names: map[string]string{"es": "Copa de Vino Blanco (Rueda)", "en": "Glass of White Wine (Rueda)"}, price: 260, icon: "wine_bar"},
			{names: map[string]string{"es": "Copa de Vino Tinto (Rioja)", "en": "Glass of Red Wine (Rioja)"}, price: 280, icon: "wine_bar"},
			{names: map[string]string{"es": "Copa de Vermut de la Casa", "en": "Glass of House Vermouth"}, price: 350, icon: "wine_bar"},
			{names: map[string]string{"es": "Copa de Baileys", "en": "Glass of Baileys"}, price: 450, icon: "liquor"},
			{names: map[string]string{"es": "Ginebra Beefeater (Sola)", "en": "Beefeater Gin (Neat)"}, price: 500, icon: "liquor"},
			{names: map[string]string{"es": "Ron Barceló Añejo (Solo)", "en": "Barceló Añejo Rum (Neat)"}, price: 500, icon: "liquor"},
			{names: map[string]string{"es": "Vodka Absolut (Solo)", "en": "Absolut Vodka (Neat)"}, price: 500, icon: "liquor"},
			{names: map[string]string{"es": "Whisky J&B (Solo)", "en": "J&B Whisky (Neat)"}, price: 500, icon: "liquor"},
			{names: map[string]string{"es": "Ron Santa Teresa (Solo)", "en": "Santa Teresa Rum (Neat)"}, price: 600, icon: "liquor"},
			{names: map[string]string{"es": "Whisky Jack Daniel's (Solo)", "en": "Jack Daniel's Whisky (Neat)"}, price: 650, icon: "liquor"},
			{names: map[string]string{"es": "Ron Havana Club 7 (Solo)", "en": "Havana Club 7 Rum (Neat)"}, price: 700, icon: "liquor"},
			{names: map[string]string{"es": "Gin Tonic Beefeater", "en": "Beefeater Gin & Tonic"}, price: 750, icon: "local_bar"},
			{names: map[string]string{"es": "Ron Barceló con Cola", "en": "Barceló Rum & Coke"}, price: 750, icon: "local_bar"},
			{names: map[string]string{"es": "Vodka Absolut con Refresco", "en": "Absolut Vodka & Soda"}, price: 750, icon: "local_bar"},
			{names: map[string]string{"es": "Whisky J&B con Refresco", "en": "J&B Whisky & Soda"}, price: 750, icon: "local_bar"},
			{names: map[string]string{"es": "Ginebra Hendrick's (Sola)", "en": "Hendrick's Gin (Neat)"}, price: 800, icon: "liquor"},
			{names: map[string]string{"es": "Ron Santa Teresa con Cola", "en": "Santa Teresa Rum & Coke"}, price: 850, icon: "local_bar"},
			{names: map[string]string{"es": "Whisky Jack Daniel's con Cola", "en": "Jack Daniel's & Coke"}, price: 850, icon: "local_bar"},
			{names: map[string]string{"es": "Ron Havana 7 con Cola", "en": "Havana Club 7 & Coke"}, price: 900, icon: "local_bar"},
			{names: map[string]string{"es": "Whisky Macallan 12 (Solo)", "en": "Macallan 12 Whisky (Neat)"}, price: 950, icon: "liquor"},
			{names: map[string]string{"es": "Gin Tonic Hendrick's", "en": "Hendrick's Gin & Tonic"}, price: 1050, icon: "local_bar"},
			{names: map[string]string{"es": "Botella de Vino Blanco (Rueda)", "en": "Bottle of White Wine (Rueda)"}, price: 1200, icon: "wine_bar"},
			{names: map[string]string{"es": "Botella de Vino Tinto (Rioja)", "en": "Bottle of Red Wine (Rioja)"}, price: 1400, icon: "wine_bar"},
		},
	},
	{
		key:     "tapas_y_raciones",
		icon:    "tapas",
		taxRate: 1000,
		names:   map[string]string{"es": "Tapas y Raciones", "en": "Tapas & Portions"},
		products: []starterProduct{
			{names: map[string]string{"es": "Pimientos del Padrón", "en": "Padrón Peppers"}, price: 550, icon: "nutrition"},
			{names: map[string]string{"es": "Ensaladilla Rusa", "en": "Russian Potato Salad"}, price: 580, icon: "tapas"},
			{names: map[string]string{"es": "Alitas de Pollo", "en": "Chicken Wings"}, price: 600, icon: "tapas"},
			{names: map[string]string{"es": "Patatas Bravas", "en": "Patatas Bravas"}, price: 650, icon: "tapas"},
			{names: map[string]string{"es": "Croquetas de Jamón (6 ud)", "en": "Ham Croquettes (6 units)"}, price: 720, icon: "tapas"},
			{names: map[string]string{"es": "Calamares a la Romana", "en": "Roman Style Calamari"}, price: 890, icon: "set_meal"},
			{names: map[string]string{"es": "Tabla de Quesos", "en": "Cheese Platter"}, price: 1200, icon: "dinner_dining"},
			{names: map[string]string{"es": "Tabla de Jamón Ibérico", "en": "Iberian Ham Platter"}, price: 1500, icon: "dinner_dining"},
		},
	},
	{
		key:     "bocadillos_y_hamburguesas",
		icon:    "lunch_dining",
		taxRate: 1000,
		names:   map[string]string{"es": "Bocadillos y Hamburguesas", "en": "Sandwiches & Burgers"},
		products: []starterProduct{
			{names: map[string]string{"es": "Sándwich Mixto", "en": "Ham and Cheese Toastie"}, price: 350, icon: "breakfast_dining"},
			{names: map[string]string{"es": "Bocadillo Tortilla de Patatas", "en": "Potato Omelette Sandwich"}, price: 450, icon: "bakery_dining"},
			{names: map[string]string{"es": "Perrito Caliente", "en": "Hot Dog"}, price: 450, icon: "lunch_dining"},
			{names: map[string]string{"es": "Bocadillo de Calamares", "en": "Calamari Sandwich"}, price: 550, icon: "bakery_dining"},
			{names: map[string]string{"es": "Bocadillo Chivito", "en": "Chivito Sandwich"}, price: 620, icon: "bakery_dining"},
			{names: map[string]string{"es": "Hamburguesa Clásica con Queso", "en": "Classic Cheeseburger"}, price: 850, icon: "lunch_dining"},
			{names: map[string]string{"es": "Hamburguesa Especial Coaster", "en": "Coaster Special Burger"}, price: 1150, icon: "lunch_dining"},
		},
	},
	{
		key:     "postres",
		icon:    "cake",
		taxRate: 1000,
		names:   map[string]string{"es": "Postres", "en": "Desserts"},
		products: []starterProduct{
			{names: map[string]string{"es": "Flan Casero", "en": "Homemade Creme Caramel"}, price: 300, icon: "cake"},
			{names: map[string]string{"es": "Helado Variado", "en": "Mixed Ice Cream"}, price: 350, icon: "icecream"},
			{names: map[string]string{"es": "Tarta de Chocolate", "en": "Chocolate Cake"}, price: 450, icon: "cake"},
			{names: map[string]string{"es": "Tarta de Queso", "en": "Cheesecake"}, price: 450, icon: "cake"},
		},
	},
}
