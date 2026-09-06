import type { Language } from '@coaster/common';

export interface StarterProduct {
  names: Record<Language, string>;
  price: number;
  icon: string;
  taxRate?: number;
}

export interface StarterCategory {
  key: string;
  icon: string;
  taxRate: number;
  names: Record<Language, string>;
  products: StarterProduct[];
}

export const STARTER_CATALOGUE: readonly StarterCategory[] = [
  {
    key: 'cafeteria',
    icon: 'coffee',
    taxRate: 1000,
    names: { es: 'Cafetería', en: 'Coffee Shop' },
    products: [
      { names: { es: 'Café Solo', en: 'Black Coffee' }, price: 120, icon: 'coffee' },
      { names: { es: 'Café Espresso', en: 'Espresso Coffee' }, price: 130, icon: 'coffee' },
      { names: { es: 'Café Cortado', en: 'Macchiato Coffee' }, price: 140, icon: 'coffee' },
      { names: { es: 'Infusión / Té', en: 'Herbal Tea / Tea' }, price: 140, icon: 'emoji_food_beverage' },
      { names: { es: 'Café con Leche', en: 'Coffee with Milk' }, price: 150, icon: 'local_cafe' },
      { names: { es: 'Colacao', en: 'Colacao Chocolate Drink' }, price: 160, icon: 'local_cafe' },
      { names: { es: 'Capuccino', en: 'Cappuccino' }, price: 220, icon: 'local_cafe' },
      { names: { es: 'Carajillo', en: 'Carajillo Coffee with Rum' }, price: 250, icon: 'coffee' },
    ],
  },
  {
    key: 'refrescos_y_aguas',
    icon: 'water_drop',
    taxRate: 1000,
    names: { es: 'Refrescos y Aguas', en: 'Soft Drinks & Water' },
    products: [
      { names: { es: 'Agua Mineral 500ml', en: 'Mineral Water 500ml' }, price: 150, icon: 'water_drop' },
      { names: { es: 'Agua con Gas', en: 'Sparkling Water' }, price: 170, icon: 'water_drop' },
      { names: { es: 'Fanta Limón', en: 'Lemon Fanta' }, price: 220, icon: 'local_drink' },
      { names: { es: 'Fanta Naranja', en: 'Orange Fanta' }, price: 220, icon: 'local_drink' },
      { names: { es: 'Tónica', en: 'Tonic Water' }, price: 220, icon: 'local_drink' },
      { names: { es: 'Coca-Cola Original', en: 'Coca-Cola Original' }, price: 230, icon: 'local_drink' },
      { names: { es: 'Coca-Cola Zero', en: 'Coca-Cola Zero' }, price: 230, icon: 'local_drink' },
      { names: { es: 'Sprite', en: 'Sprite' }, price: 230, icon: 'local_drink' },
      { names: { es: 'Aquarius Limón', en: 'Lemon Aquarius' }, price: 240, icon: 'local_drink' },
      { names: { es: 'Nestea', en: 'Nestea Ice Tea' }, price: 240, icon: 'emoji_food_beverage' },
    ],
  },
  {
    key: 'cervezas',
    icon: 'sports_bar',
    taxRate: 1000,
    names: { es: 'Cervezas', en: 'Beers' },
    products: [
      {
        names: { es: 'Caña de Cerveza (Estrella Galicia)', en: 'Draught Beer (Estrella Galicia)' },
        price: 220,
        icon: 'sports_bar',
      },
      { names: { es: 'Tercio Mahou 0,0 Tostada', en: 'Mahou 0.0 Toasted (Non-Alc)' }, price: 260, icon: 'sports_bar' },
      { names: { es: 'Tercio Heineken 0,0', en: 'Heineken 0.0 (Non-Alc)' }, price: 270, icon: 'sports_bar' },
      { names: { es: 'Tercio Mahou Cinco Estrellas', en: 'Mahou 5 Estrellas Bottle' }, price: 270, icon: 'sports_bar' },
      { names: { es: 'Tercio Estrella Galicia', en: 'Estrella Galicia Bottle' }, price: 280, icon: 'sports_bar' },
      { names: { es: 'Tercio Mahou Rosé', en: 'Mahou Rosé Bottle' }, price: 280, icon: 'sports_bar' },
      { names: { es: 'Tercio Heineken', en: 'Heineken Bottle' }, price: 290, icon: 'sports_bar' },
      {
        names: { es: 'Doble de Cerveza (Estrella Galicia)', en: 'Large Draught Beer (Estrella Galicia)' },
        price: 300,
        icon: 'sports_bar',
      },
      {
        names: { es: 'Tercio El Águila Sin Filtrar', en: 'El Águila Unfiltered Bottle' },
        price: 300,
        icon: 'sports_bar',
      },
      { names: { es: 'Tercio Coronita', en: 'Corona Bottle' }, price: 320, icon: 'sports_bar' },
      {
        names: { es: 'Tercio 1906 Reserva Especial', en: '1906 Reserva Especial Bottle' },
        price: 340,
        icon: 'sports_bar',
      },
      { names: { es: 'Tercio Alhambra Reserva 1925', en: 'Alhambra 1925 Bottle' }, price: 350, icon: 'sports_bar' },
      { names: { es: 'Tinto de Verano', en: 'Tinto de Verano (Wine & Lemon)' }, price: 350, icon: 'wine_bar' },
      { names: { es: 'Tercio Paulaner (Trigo)', en: 'Paulaner Wheat Beer Bottle' }, price: 450, icon: 'sports_bar' },
    ],
  },
  {
    key: 'vinos_y_licores',
    icon: 'wine_bar',
    taxRate: 1000,
    names: { es: 'Vinos y Licores', en: 'Wines & Spirits' },
    products: [
      { names: { es: 'Chupito de Licor de Hierbas', en: 'Herbal Liqueur Shot' }, price: 200, icon: 'liquor' },
      { names: { es: 'Chupito de Jägermeister', en: 'Jägermeister Shot' }, price: 250, icon: 'liquor' },
      { names: { es: 'Copa de Vino Blanco (Rueda)', en: 'Glass of White Wine (Rueda)' }, price: 260, icon: 'wine_bar' },
      { names: { es: 'Copa de Vino Tinto (Rioja)', en: 'Glass of Red Wine (Rioja)' }, price: 280, icon: 'wine_bar' },
      { names: { es: 'Copa de Vermut de la Casa', en: 'Glass of House Vermouth' }, price: 350, icon: 'wine_bar' },
      { names: { es: 'Copa de Baileys', en: 'Glass of Baileys' }, price: 450, icon: 'liquor' },
      { names: { es: 'Ginebra Beefeater (Sola)', en: 'Beefeater Gin (Neat)' }, price: 500, icon: 'liquor' },
      { names: { es: 'Ron Barceló Añejo (Solo)', en: 'Barceló Añejo Rum (Neat)' }, price: 500, icon: 'liquor' },
      { names: { es: 'Vodka Absolut (Solo)', en: 'Absolut Vodka (Neat)' }, price: 500, icon: 'liquor' },
      { names: { es: 'Whisky J&B (Solo)', en: 'J&B Whisky (Neat)' }, price: 500, icon: 'liquor' },
      { names: { es: 'Ron Santa Teresa (Solo)', en: 'Santa Teresa Rum (Neat)' }, price: 600, icon: 'liquor' },
      { names: { es: "Whisky Jack Daniel's (Solo)", en: "Jack Daniel's Whisky (Neat)" }, price: 650, icon: 'liquor' },
      { names: { es: 'Ron Havana Club 7 (Solo)', en: 'Havana Club 7 Rum (Neat)' }, price: 700, icon: 'liquor' },
      { names: { es: 'Gin Tonic Beefeater', en: 'Beefeater Gin & Tonic' }, price: 750, icon: 'local_bar' },
      { names: { es: 'Ron Barceló con Cola', en: 'Barceló Rum & Coke' }, price: 750, icon: 'local_bar' },
      { names: { es: 'Vodka Absolut con Refresco', en: 'Absolut Vodka & Soda' }, price: 750, icon: 'local_bar' },
      { names: { es: 'Whisky J&B con Refresco', en: 'J&B Whisky & Soda' }, price: 750, icon: 'local_bar' },
      { names: { es: "Ginebra Hendrick's (Sola)", en: "Hendrick's Gin (Neat)" }, price: 800, icon: 'liquor' },
      { names: { es: 'Ron Santa Teresa con Cola', en: 'Santa Teresa Rum & Coke' }, price: 850, icon: 'local_bar' },
      { names: { es: "Whisky Jack Daniel's con Cola", en: "Jack Daniel's & Coke" }, price: 850, icon: 'local_bar' },
      { names: { es: 'Ron Havana 7 con Cola', en: 'Havana Club 7 & Coke' }, price: 900, icon: 'local_bar' },
      { names: { es: 'Whisky Macallan 12 (Solo)', en: 'Macallan 12 Whisky (Neat)' }, price: 950, icon: 'liquor' },
      { names: { es: "Gin Tonic Hendrick's", en: "Hendrick's Gin & Tonic" }, price: 1050, icon: 'local_bar' },
      {
        names: { es: 'Botella de Vino Blanco (Rueda)', en: 'Bottle of White Wine (Rueda)' },
        price: 1200,
        icon: 'wine_bar',
      },
      {
        names: { es: 'Botella de Vino Tinto (Rioja)', en: 'Bottle of Red Wine (Rioja)' },
        price: 1400,
        icon: 'wine_bar',
      },
    ],
  },
  {
    key: 'tapas_y_raciones',
    icon: 'tapas',
    taxRate: 1000,
    names: { es: 'Tapas y Raciones', en: 'Tapas & Portions' },
    products: [
      { names: { es: 'Pimientos del Padrón', en: 'Padrón Peppers' }, price: 550, icon: 'nutrition' },
      { names: { es: 'Ensaladilla Rusa', en: 'Russian Potato Salad' }, price: 580, icon: 'tapas' },
      { names: { es: 'Alitas de Pollo', en: 'Chicken Wings' }, price: 600, icon: 'tapas' },
      { names: { es: 'Patatas Bravas', en: 'Patatas Bravas' }, price: 650, icon: 'tapas' },
      { names: { es: 'Croquetas de Jamón (6 ud)', en: 'Ham Croquettes (6 units)' }, price: 720, icon: 'tapas' },
      { names: { es: 'Calamares a la Romana', en: 'Roman Style Calamari' }, price: 890, icon: 'set_meal' },
      { names: { es: 'Tabla de Quesos', en: 'Cheese Platter' }, price: 1200, icon: 'dinner_dining' },
      { names: { es: 'Tabla de Jamón Ibérico', en: 'Iberian Ham Platter' }, price: 1500, icon: 'dinner_dining' },
    ],
  },
  {
    key: 'bocadillos_y_hamburguesas',
    icon: 'lunch_dining',
    taxRate: 1000,
    names: { es: 'Bocadillos y Hamburguesas', en: 'Sandwiches & Burgers' },
    products: [
      { names: { es: 'Sándwich Mixto', en: 'Ham and Cheese Toastie' }, price: 350, icon: 'breakfast_dining' },
      {
        names: { es: 'Bocadillo Tortilla de Patatas', en: 'Potato Omelette Sandwich' },
        price: 450,
        icon: 'bakery_dining',
      },
      { names: { es: 'Perrito Caliente', en: 'Hot Dog' }, price: 450, icon: 'lunch_dining' },
      { names: { es: 'Bocadillo de Calamares', en: 'Calamari Sandwich' }, price: 550, icon: 'bakery_dining' },
      { names: { es: 'Bocadillo Chivito', en: 'Chivito Sandwich' }, price: 620, icon: 'bakery_dining' },
      { names: { es: 'Hamburguesa Clásica con Queso', en: 'Classic Cheeseburger' }, price: 850, icon: 'lunch_dining' },
      {
        names: { es: 'Hamburguesa Especial Coaster', en: 'Coaster Special Burger' },
        price: 1150,
        icon: 'lunch_dining',
      },
    ],
  },
  {
    key: 'postres',
    icon: 'cake',
    taxRate: 1000,
    names: { es: 'Postres', en: 'Desserts' },
    products: [
      { names: { es: 'Flan Casero', en: 'Homemade Creme Caramel' }, price: 300, icon: 'cake' },
      { names: { es: 'Helado Variado', en: 'Mixed Ice Cream' }, price: 350, icon: 'icecream' },
      { names: { es: 'Tarta de Chocolate', en: 'Chocolate Cake' }, price: 450, icon: 'cake' },
      { names: { es: 'Tarta de Queso', en: 'Cheesecake' }, price: 450, icon: 'cake' },
    ],
  },
];
