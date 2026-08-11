import type { Language } from '@coaster/common';

export interface StarterProduct {
  names: Record<Language, string>;
  price: number;
}

export interface StarterCategory {
  key: string;
  icon: string | null;
  names: Record<Language, string>;
  products: StarterProduct[];
}

export const STARTER_CATALOGUE: readonly StarterCategory[] = [
  {
    key: 'cafeteria',
    icon: 'coffee',
    names: { es: 'Cafetería', en: 'Coffee Shop' },
    products: [
      { names: { es: 'Café Solo', en: 'Black Coffee' }, price: 120 },
      { names: { es: 'Café Espresso', en: 'Espresso Coffee' }, price: 130 },
      { names: { es: 'Café Cortado', en: 'Macchiato Coffee' }, price: 140 },
      { names: { es: 'Infusión / Té', en: 'Herbal Tea / Tea' }, price: 140 },
      { names: { es: 'Café con Leche', en: 'Coffee with Milk' }, price: 150 },
      { names: { es: 'Colacao', en: 'Colacao Chocolate Drink' }, price: 160 },
      { names: { es: 'Capuccino', en: 'Cappuccino' }, price: 220 },
      { names: { es: 'Carajillo', en: 'Carajillo Coffee with Rum' }, price: 250 },
    ],
  },
  {
    key: 'refrescos_y_aguas',
    icon: 'water-drop',
    names: { es: 'Refrescos y Aguas', en: 'Soft Drinks & Water' },
    products: [
      { names: { es: 'Agua Mineral 500ml', en: 'Mineral Water 500ml' }, price: 150 },
      { names: { es: 'Agua con Gas', en: 'Sparkling Water' }, price: 170 },
      { names: { es: 'Fanta Limón', en: 'Lemon Fanta' }, price: 220 },
      { names: { es: 'Fanta Naranja', en: 'Orange Fanta' }, price: 220 },
      { names: { es: 'Tónica', en: 'Tonic Water' }, price: 220 },
      { names: { es: 'Coca-Cola Original', en: 'Coca-Cola Original' }, price: 230 },
      { names: { es: 'Coca-Cola Zero', en: 'Coca-Cola Zero' }, price: 230 },
      { names: { es: 'Sprite', en: 'Sprite' }, price: 230 },
      { names: { es: 'Aquarius Limón', en: 'Lemon Aquarius' }, price: 240 },
      { names: { es: 'Nestea', en: 'Nestea Ice Tea' }, price: 240 },
    ],
  },
  {
    key: 'cervezas',
    icon: 'beer',
    names: { es: 'Cervezas', en: 'Beers' },
    products: [
      { names: { es: 'Caña de Cerveza (Estrella Galicia)', en: 'Draught Beer (Estrella Galicia)' }, price: 220 },
      { names: { es: 'Tercio Mahou 0,0 Tostada', en: 'Mahou 0.0 Toasted (Non-Alc)' }, price: 260 },
      { names: { es: 'Tercio Heineken 0,0', en: 'Heineken 0.0 (Non-Alc)' }, price: 270 },
      { names: { es: 'Tercio Mahou Cinco Estrellas', en: 'Mahou 5 Estrellas Bottle' }, price: 270 },
      { names: { es: 'Tercio Estrella Galicia', en: 'Estrella Galicia Bottle' }, price: 280 },
      { names: { es: 'Tercio Mahou Rosé', en: 'Mahou Rosé Bottle' }, price: 280 },
      { names: { es: 'Tercio Heineken', en: 'Heineken Bottle' }, price: 290 },
      { names: { es: 'Doble de Cerveza (Estrella Galicia)', en: 'Large Draught Beer (Estrella Galicia)' }, price: 300 },
      { names: { es: 'Tercio El Águila Sin Filtrar', en: 'El Águila Unfiltered Bottle' }, price: 300 },
      { names: { es: 'Tercio Coronita', en: 'Corona Bottle' }, price: 320 },
      { names: { es: 'Tercio 1906 Reserva Especial', en: '1906 Reserva Especial Bottle' }, price: 340 },
      { names: { es: 'Tercio Alhambra Reserva 1925', en: 'Alhambra 1925 Bottle' }, price: 350 },
      { names: { es: 'Tinto de Verano', en: 'Tinto de Verano (Wine & Lemon)' }, price: 350 },
      { names: { es: 'Tercio Paulaner (Trigo)', en: 'Paulaner Wheat Beer Bottle' }, price: 450 },
    ],
  },
  {
    key: 'vinos_y_licores',
    icon: 'wine',
    names: { es: 'Vinos y Licores', en: 'Wines & Spirits' },
    products: [
      { names: { es: 'Chupito de Licor de Hierbas', en: 'Herbal Liqueur Shot' }, price: 200 },
      { names: { es: 'Chupito de Jägermeister', en: 'Jägermeister Shot' }, price: 250 },
      { names: { es: 'Copa de Vino Blanco (Rueda)', en: 'Glass of White Wine (Rueda)' }, price: 260 },
      { names: { es: 'Copa de Vino Tinto (Rioja)', en: 'Glass of Red Wine (Rioja)' }, price: 280 },
      { names: { es: 'Copa de Vermut de la Casa', en: 'Glass of House Vermouth' }, price: 350 },
      { names: { es: 'Copa de Baileys', en: 'Glass of Baileys' }, price: 450 },
      { names: { es: 'Ginebra Beefeater (Sola)', en: 'Beefeater Gin (Neat)' }, price: 500 },
      { names: { es: 'Ron Barceló Añejo (Solo)', en: 'Barceló Añejo Rum (Neat)' }, price: 500 },
      { names: { es: 'Vodka Absolut (Solo)', en: 'Absolut Vodka (Neat)' }, price: 500 },
      { names: { es: 'Whisky J&B (Solo)', en: 'J&B Whisky (Neat)' }, price: 500 },
      { names: { es: 'Ron Santa Teresa (Solo)', en: 'Santa Teresa Rum (Neat)' }, price: 600 },
      { names: { es: "Whisky Jack Daniel's (Solo)", en: "Jack Daniel's Whisky (Neat)" }, price: 650 },
      { names: { es: 'Ron Havana Club 7 (Solo)', en: 'Havana Club 7 Rum (Neat)' }, price: 700 },
      { names: { es: 'Gin Tonic Beefeater', en: 'Beefeater Gin & Tonic' }, price: 750 },
      { names: { es: 'Ron Barceló con Cola', en: 'Barceló Rum & Coke' }, price: 750 },
      { names: { es: 'Vodka Absolut con Refresco', en: 'Absolut Vodka & Soda' }, price: 750 },
      { names: { es: 'Whisky J&B con Refresco', en: 'J&B Whisky & Soda' }, price: 750 },
      { names: { es: "Ginebra Hendrick's (Sola)", en: "Hendrick's Gin (Neat)" }, price: 800 },
      { names: { es: 'Ron Santa Teresa con Cola', en: 'Santa Teresa Rum & Coke' }, price: 850 },
      { names: { es: "Whisky Jack Daniel's con Cola", en: "Jack Daniel's & Coke" }, price: 850 },
      { names: { es: 'Ron Havana 7 con Cola', en: 'Havana Club 7 & Coke' }, price: 900 },
      { names: { es: 'Whisky Macallan 12 (Solo)', en: 'Macallan 12 Whisky (Neat)' }, price: 950 },
      { names: { es: "Gin Tonic Hendrick's", en: "Hendrick's Gin & Tonic" }, price: 1050 },
      { names: { es: 'Botella de Vino Blanco (Rueda)', en: 'Bottle of White Wine (Rueda)' }, price: 1200 },
      { names: { es: 'Botella de Vino Tinto (Rioja)', en: 'Bottle of Red Wine (Rioja)' }, price: 1400 },
    ],
  },
  {
    key: 'tapas_y_raciones',
    icon: 'restaurant',
    names: { es: 'Tapas y Raciones', en: 'Tapas & Portions' },
    products: [
      { names: { es: 'Pimientos del Padrón', en: 'Padrón Peppers' }, price: 550 },
      { names: { es: 'Ensaladilla Rusa', en: 'Russian Potato Salad' }, price: 580 },
      { names: { es: 'Alitas de Pollo', en: 'Chicken Wings' }, price: 600 },
      { names: { es: 'Patatas Bravas', en: 'Patatas Bravas' }, price: 650 },
      { names: { es: 'Croquetas de Jamón (6 ud)', en: 'Ham Croquettes (6 units)' }, price: 720 },
      { names: { es: 'Calamares a la Romana', en: 'Roman Style Calamari' }, price: 890 },
      { names: { es: 'Tabla de Quesos', en: 'Cheese Platter' }, price: 1200 },
      { names: { es: 'Tabla de Jamón Ibérico', en: 'Iberian Ham Platter' }, price: 1500 },
    ],
  },
  {
    key: 'bocadillos_y_hamburguesas',
    icon: 'lunch-dining',
    names: { es: 'Bocadillos y Hamburguesas', en: 'Sandwiches & Burgers' },
    products: [
      { names: { es: 'Sándwich Mixto', en: 'Ham and Cheese Toastie' }, price: 350 },
      { names: { es: 'Bocadillo Tortilla de Patatas', en: 'Potato Omelette Sandwich' }, price: 450 },
      { names: { es: 'Perrito Caliente', en: 'Hot Dog' }, price: 450 },
      { names: { es: 'Bocadillo de Calamares', en: 'Calamari Sandwich' }, price: 550 },
      { names: { es: 'Bocadillo Chivito', en: 'Chivito Sandwich' }, price: 620 },
      { names: { es: 'Hamburguesa Clásica con Queso', en: 'Classic Cheeseburger' }, price: 850 },
      { names: { es: 'Hamburguesa Especial Coaster', en: 'Coaster Special Burger' }, price: 1150 },
    ],
  },
  {
    key: 'postres',
    icon: 'cake',
    names: { es: 'Postres', en: 'Desserts' },
    products: [
      { names: { es: 'Flan Casero', en: 'Homemade Creme Caramel' }, price: 300 },
      { names: { es: 'Helado Variado', en: 'Mixed Ice Cream' }, price: 350 },
      { names: { es: 'Tarta de Chocolate', en: 'Chocolate Cake' }, price: 450 },
      { names: { es: 'Tarta de Queso', en: 'Cheesecake' }, price: 450 },
    ],
  },
];
