// Seed for StolikQR Demo Platform v1 — "1920 Tavern" (D9.1 content rebuild).
//
// Safely rerunnable: reuses the existing Restaurant/Location/Table/StaffUser
// rows for slug "demo-restaurant" (so the table's qrToken and the staff
// login stay stable across reseeds — bookmarked demo URLs and Waiter App
// logins keep working), but wipes and rebuilds everything downstream of the
// menu (transactional guest activity + the old category/dish tree) so a
// fresh reseed never leaves orphaned test data or duplicate rows behind.

import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- source data --------------------------------------------------------

const sourceCategories = [
  {
    id: 'cat-starters',
    slug: 'starters',
    name: { uk: 'Закуски', en: 'Starters' },
  },
  { id: 'cat-salads', slug: 'salads', name: { uk: 'Салати', en: 'Salads' } },
  {
    id: 'cat-mains',
    slug: 'mains',
    name: { uk: 'Основні страви', en: 'Mains' },
  },
  { id: 'cat-drinks', slug: 'drinks', name: { uk: 'Напої', en: 'Drinks' } },
];

interface SourceOptionChoice {
  id: string;
  name: { uk: string; en: string };
  priceDelta: number;
  exclusive?: boolean;
}
interface SourceOptionGroup {
  id: string;
  name: { uk: string; en: string };
  required: boolean;
  multiple: boolean;
  choices: SourceOptionChoice[];
}
interface SourceIngredient {
  id: string;
  name: { uk: string; en: string };
  icon: string;
}
interface SourceDish {
  id: string;
  slug: string;
  categoryId: string;
  featured?: boolean;
  relatedDishIds?: string[];
  name: { uk: string; en: string };
  description: { uk: string; en: string };
  price: number;
  emoji: string;
  gradient: string;
  photoUrl: string;
  tags?: { uk: string[]; en: string[] };
  ingredients: SourceIngredient[];
  optionGroups?: SourceOptionGroup[];
}

const sourceDishes: SourceDish[] = [
  // --- Starters -----------------------------------------------------------
  {
    id: 'dish-wings',
    slug: 'spicy-chicken-wings',
    relatedDishIds: ['dish-cocktail', 'dish-ribs'],
    categoryId: 'cat-starters',
    name: { uk: 'Гострі курячі крильця', en: 'Spicy Chicken Wings' },
    description: {
      uk: 'Хрусткі крильця в гострій глазурі з часником та свіжим чилі.',
      en: 'Crispy wings glazed in a spicy garlic-chili sauce.',
    },
    price: 210,
    emoji: '🍗',
    gradient: 'from-red-400 to-orange-600',
    photoUrl: '/dishes/wings.jpg',
    tags: { uk: ['гостре'], en: ['spicy'] },
    ingredients: [
      {
        id: 'chicken-wings',
        name: { uk: 'курячі крильця', en: 'chicken wings' },
        icon: 'meat',
      },
      { id: 'chili', name: { uk: 'чилі', en: 'chili pepper' }, icon: 'pepper' },
      {
        id: 'garlic-glaze',
        name: { uk: 'часниковий соус', en: 'garlic glaze' },
        icon: 'garlic',
      },
    ],
    optionGroups: [
      {
        id: 'og-wings-heat',
        name: { uk: 'Гострота', en: 'Spice level' },
        required: false,
        multiple: false,
        choices: [
          { id: 'oc-mild', name: { uk: 'Помірно', en: 'Mild' }, priceDelta: 0 },
          {
            id: 'oc-hot',
            name: { uk: 'Дуже гостро', en: 'Extra hot' },
            priceDelta: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'dish-ribs',
    slug: 'bbq-pork-ribs',
    featured: true,
    relatedDishIds: ['dish-cocktail', 'dish-pizza'],
    categoryId: 'cat-starters',
    name: { uk: 'Реберця BBQ', en: 'BBQ Pork Ribs' },
    description: {
      uk: 'Свинячі реберця, томлені кілька годин і запечені в фірмовому BBQ-соусі з томатами.',
      en: 'Slow-cooked pork ribs finished on the grill with house BBQ glaze and roasted tomato.',
    },
    price: 320,
    emoji: '🍖',
    gradient: 'from-amber-600 to-red-700',
    photoUrl: '/dishes/ribs.jpg',
    tags: { uk: ['хіт'], en: ['bestseller'] },
    ingredients: [
      {
        id: 'pork-ribs',
        name: { uk: 'свинячі реберця', en: 'pork ribs' },
        icon: 'meat',
      },
      {
        id: 'bbq-glaze',
        name: { uk: 'BBQ-соус', en: 'BBQ glaze' },
        icon: 'generic',
      },
      {
        id: 'roasted-tomato',
        name: { uk: 'печені томати', en: 'roasted tomato' },
        icon: 'tomato',
      },
    ],
  },
  {
    id: 'dish-cheese-sticks',
    slug: 'cheese-sticks',
    relatedDishIds: ['dish-wine'],
    categoryId: 'cat-starters',
    name: { uk: 'Сирні палички', en: 'Cheese Sticks' },
    description: {
      uk: 'Хрусткі палички з чедером у панірувальних сухарях, подаються з ягідним соусом.',
      en: 'Crispy breaded cheddar sticks served with a sweet berry dip.',
    },
    price: 175,
    emoji: '🧀',
    gradient: 'from-amber-300 to-yellow-500',
    photoUrl: '/dishes/cheese-sticks.jpg',
    tags: { uk: ['вегетаріанське'], en: ['vegetarian'] },
    ingredients: [
      {
        id: 'cheddar-stick',
        name: { uk: 'чедер', en: 'cheddar' },
        icon: 'cheese',
      },
      {
        id: 'breadcrumbs',
        name: { uk: 'панірування', en: 'breadcrumbs' },
        icon: 'bread',
      },
      {
        id: 'berry-sauce',
        name: { uk: 'ягідний соус', en: 'berry sauce' },
        icon: 'generic',
      },
    ],
  },
  {
    id: 'dish-cheese-board',
    slug: 'cheese-board',
    relatedDishIds: ['dish-wine', 'dish-cocktail'],
    categoryId: 'cat-starters',
    name: { uk: 'Сирна тарілка', en: 'Cheese Board' },
    description: {
      uk: 'Асорті витриманих сирів із крекерами, медом та ягідним джемом.',
      en: 'An assortment of aged cheeses with crackers, honey, and berry jam.',
    },
    price: 280,
    emoji: '🧈',
    gradient: 'from-yellow-200 to-amber-400',
    photoUrl: '/dishes/cheese-board.jpg',
    tags: { uk: ['вегетаріанське'], en: ['vegetarian'] },
    ingredients: [
      {
        id: 'parmesan-board',
        name: { uk: 'пармезан', en: 'parmesan' },
        icon: 'cheese',
      },
      {
        id: 'blue-cheese',
        name: { uk: 'блакитний сир', en: 'blue cheese' },
        icon: 'cheese',
      },
      {
        id: 'crackers',
        name: { uk: 'крекери', en: 'crackers' },
        icon: 'bread',
      },
      { id: 'honey', name: { uk: 'мед', en: 'honey' }, icon: 'generic' },
    ],
  },
  // --- Salads ---------------------------------------------------------------
  {
    id: 'dish-corn-salad',
    slug: 'corn-arugula-salad',
    relatedDishIds: ['dish-wine'],
    categoryId: 'cat-salads',
    name: { uk: 'Салат з кукурудзою і руколою', en: 'Corn & Arugula Salad' },
    description: {
      uk: 'Молода рукола, солодка кукурудза, вишневі томати та легка оливкова заправка.',
      en: 'Baby arugula, sweet corn, cherry tomatoes and a light olive oil dressing.',
    },
    price: 195,
    emoji: '🥗',
    gradient: 'from-lime-300 to-green-500',
    photoUrl: '/dishes/corn-arugula-salad.jpg',
    tags: { uk: ['вегетаріанське'], en: ['vegetarian'] },
    ingredients: [
      { id: 'arugula', name: { uk: 'рукола', en: 'arugula' }, icon: 'generic' },
      {
        id: 'corn-salad',
        name: { uk: 'кукурудза', en: 'corn' },
        icon: 'generic',
      },
      {
        id: 'cherry-tomato',
        name: { uk: 'вишневі томати', en: 'cherry tomatoes' },
        icon: 'tomato',
      },
      {
        id: 'olive-oil-dressing',
        name: { uk: 'оливкова олія', en: 'olive oil' },
        icon: 'oliveOil',
      },
    ],
    optionGroups: [
      {
        id: 'og-corn-salad-protein',
        name: { uk: 'Білок', en: 'Protein' },
        required: false,
        multiple: false,
        choices: [
          {
            id: 'oc-corn-none',
            name: { uk: 'Без білка', en: 'No protein' },
            priceDelta: 0,
          },
          {
            id: 'oc-corn-chicken',
            name: { uk: 'Куряче філе на грилі', en: 'Grilled chicken' },
            priceDelta: 55,
          },
          {
            id: 'oc-corn-shrimp',
            name: { uk: 'Креветки', en: 'Shrimp' },
            priceDelta: 80,
          },
        ],
      },
    ],
  },
  {
    id: 'dish-crispy-chicken-salad',
    slug: 'crispy-chicken-salad',
    relatedDishIds: ['dish-wine'],
    categoryId: 'cat-salads',
    name: { uk: 'Хрустка курка з ягідним соусом', en: 'Crispy Chicken Salad' },
    description: {
      uk: 'Мікс салатних листків, хрустка паніровaна курка, мигдальні пластівці та ягідна глазур.',
      en: 'Mixed greens, crispy breaded chicken, toasted almonds and a berry glaze.',
    },
    price: 225,
    emoji: '🥙',
    gradient: 'from-rose-300 to-red-500',
    photoUrl: '/dishes/crispy-chicken-salad.jpg',
    ingredients: [
      {
        id: 'mixed-greens',
        name: { uk: 'мікс салату', en: 'mixed greens' },
        icon: 'generic',
      },
      {
        id: 'crispy-chicken',
        name: { uk: 'хрустка курка', en: 'crispy chicken' },
        icon: 'meat',
      },
      {
        id: 'almonds',
        name: { uk: 'мигдальні пластівці', en: 'almond flakes' },
        icon: 'generic',
      },
      {
        id: 'berry-glaze',
        name: { uk: 'ягідна глазур', en: 'berry glaze' },
        icon: 'generic',
      },
    ],
  },
  // --- Mains ------------------------------------------------------------
  {
    id: 'dish-sausages-grits',
    slug: 'sausages-cheese-grits',
    relatedDishIds: ['dish-cocktail'],
    categoryId: 'cat-mains',
    name: {
      uk: 'Ковбаски на кукурудзяній поленті',
      en: 'Sausages & Cheese Grits',
    },
    description: {
      uk: 'Домашні ковбаски на грилі, вершкова кукурудзяна полента, соус з печених томатів.',
      en: 'Grilled house sausages over creamy cheese grits, with a roasted tomato sauce.',
    },
    price: 260,
    emoji: '🌽',
    gradient: 'from-yellow-300 to-amber-600',
    photoUrl: '/dishes/sausages-grits.jpg',
    ingredients: [
      {
        id: 'pork-sausage',
        name: { uk: 'свиняча ковбаска', en: 'pork sausage' },
        icon: 'meat',
      },
      {
        id: 'grits',
        name: { uk: 'кукурудзяна полента', en: 'cheese grits' },
        icon: 'generic',
      },
      {
        id: 'roasted-tomato-sauce',
        name: { uk: 'соус з печених томатів', en: 'roasted tomato sauce' },
        icon: 'tomato',
      },
      {
        id: 'sweet-corn',
        name: { uk: 'солодка кукурудза', en: 'sweet corn' },
        icon: 'generic',
      },
    ],
  },
  {
    id: 'dish-pork-chop',
    slug: 'grilled-pork-chop',
    relatedDishIds: ['dish-cocktail', 'dish-wine'],
    categoryId: 'cat-mains',
    name: { uk: 'Свиняча котлета на грилі', en: 'Grilled Pork Chop' },
    description: {
      uk: 'Соковита свиняча котлета на кістці з картопляними часточками та печеними овочами.',
      en: 'A juicy bone-in pork chop with roasted potato wedges and grilled vegetables.',
    },
    price: 295,
    emoji: '🍽️',
    gradient: 'from-orange-400 to-amber-700',
    photoUrl: '/dishes/pork-chop.jpg',
    ingredients: [
      {
        id: 'pork-chop',
        name: { uk: 'свиняча котлета', en: 'pork chop' },
        icon: 'meat',
      },
      {
        id: 'potato-wedges',
        name: { uk: 'картопляні часточки', en: 'potato wedges' },
        icon: 'generic',
      },
      {
        id: 'grilled-onion',
        name: { uk: 'смажена цибуля', en: 'grilled onion' },
        icon: 'onion',
      },
      {
        id: 'bell-pepper',
        name: { uk: 'болгарський перець', en: 'bell pepper' },
        icon: 'pepper',
      },
    ],
    optionGroups: [
      {
        id: 'og-porkchop-doneness',
        name: { uk: 'Ступінь прожарки', en: 'Doneness' },
        required: true,
        multiple: false,
        choices: [
          {
            id: 'oc-pc-medium',
            name: { uk: 'Medium', en: 'Medium' },
            priceDelta: 0,
          },
          {
            id: 'oc-pc-well',
            name: { uk: 'Well done', en: 'Well done' },
            priceDelta: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'dish-salmon',
    slug: 'pan-seared-salmon',
    relatedDishIds: ['dish-wine'],
    categoryId: 'cat-mains',
    name: { uk: 'Лосось на кукурудзяному пюре', en: 'Pan-Seared Salmon' },
    description: {
      uk: 'Лосось з хрусткою скоринкою на ніжному кукурудзяному пюре з пармезановою чипсою.',
      en: 'Crispy-skin salmon over sweet corn purée with a parmesan crisp.',
    },
    price: 340,
    emoji: '🐟',
    gradient: 'from-yellow-200 to-orange-400',
    photoUrl: '/dishes/salmon.jpg',
    tags: { uk: ['без глютену'], en: ['gluten-free'] },
    ingredients: [
      {
        id: 'salmon-fillet',
        name: { uk: 'філе лосося', en: 'salmon fillet' },
        icon: 'fish',
      },
      {
        id: 'corn-puree',
        name: { uk: 'кукурудзяне пюре', en: 'corn purée' },
        icon: 'generic',
      },
      {
        id: 'parmesan-crisp',
        name: { uk: 'пармезанова чипса', en: 'parmesan crisp' },
        icon: 'cheese',
      },
    ],
  },
  {
    id: 'dish-pizza',
    slug: 'chicago-deep-dish-pizza',
    featured: true,
    relatedDishIds: ['dish-cocktail', 'dish-wings'],
    categoryId: 'cat-mains',
    name: { uk: 'Чикаго-піца дип-діш', en: 'Chicago Deep-Dish Pizza' },
    description: {
      uk: 'Висока піца на товстому тісті з томатним соусом, моцарелою та пармезаном — готується у формі.',
      en: 'Thick-crust deep-dish pizza baked in a pan with tomato sauce, mozzarella and parmesan.',
    },
    price: 310,
    emoji: '🍕',
    gradient: 'from-red-500 to-orange-600',
    photoUrl: '/dishes/deep-dish-pizza.jpg',
    tags: { uk: ['хіт', 'на компанію'], en: ['bestseller', 'to share'] },
    ingredients: [
      { id: 'pizza-dough', name: { uk: 'тісто', en: 'dough' }, icon: 'bread' },
      {
        id: 'pizza-tomato-sauce',
        name: { uk: 'томатний соус', en: 'tomato sauce' },
        icon: 'tomato',
      },
      {
        id: 'pizza-mozzarella',
        name: { uk: 'моцарела', en: 'mozzarella' },
        icon: 'cheese',
      },
      {
        id: 'pizza-parmesan',
        name: { uk: 'пармезан', en: 'parmesan' },
        icon: 'cheese',
      },
    ],
    optionGroups: [
      {
        id: 'og-pizza-extras',
        name: { uk: 'Додатки', en: 'Extras' },
        required: false,
        multiple: true,
        choices: [
          {
            id: 'oc-pizza-pepperoni',
            name: { uk: 'Пепероні', en: 'Pepperoni' },
            priceDelta: 45,
          },
          {
            id: 'oc-pizza-mushrooms',
            name: { uk: 'Гриби', en: 'Mushrooms' },
            priceDelta: 30,
          },
          {
            id: 'oc-pizza-cheese',
            name: { uk: 'Додатковий сир', en: 'Extra cheese' },
            priceDelta: 35,
          },
        ],
      },
    ],
  },
  {
    id: 'dish-burger',
    slug: 'bacon-cheddar-burger',
    featured: true,
    relatedDishIds: ['dish-cocktail', 'dish-wings'],
    categoryId: 'cat-mains',
    name: { uk: 'Бургер бекон-чедер', en: 'Bacon Cheddar Burger' },
    description: {
      uk: 'Яловича котлета, хрусткий бекон, чедер та фірмовий соус у булці бріош.',
      en: 'Beef patty, crispy bacon, cheddar and house sauce in a brioche bun.',
    },
    price: 265,
    emoji: '🍔',
    gradient: 'from-amber-400 to-rose-500',
    photoUrl: '/dishes/bacon-cheddar-burger.jpg',
    ingredients: [
      {
        id: 'brioche-bun-burger',
        name: { uk: 'булка бріош', en: 'brioche bun' },
        icon: 'bread',
      },
      {
        id: 'beef-patty-burger',
        name: { uk: 'яловича котлета', en: 'beef patty' },
        icon: 'meat',
      },
      { id: 'bacon-burger', name: { uk: 'бекон', en: 'bacon' }, icon: 'meat' },
      {
        id: 'cheddar-burger',
        name: { uk: 'чедер', en: 'cheddar' },
        icon: 'cheese',
      },
      {
        id: 'arugula-burger',
        name: { uk: 'рукола', en: 'arugula' },
        icon: 'generic',
      },
      {
        id: 'red-onion-burger',
        name: { uk: 'червона цибуля', en: 'red onion' },
        icon: 'onion',
      },
    ],
    optionGroups: [
      {
        id: 'og-burger-doneness',
        name: { uk: 'Ступінь прожарки', en: 'Doneness' },
        required: true,
        multiple: false,
        choices: [
          {
            id: 'oc-burger-medium',
            name: { uk: 'Medium', en: 'Medium' },
            priceDelta: 0,
          },
          {
            id: 'oc-burger-well',
            name: { uk: 'Well done', en: 'Well done' },
            priceDelta: 0,
          },
        ],
      },
      {
        id: 'og-burger-extras',
        name: { uk: 'Додатки', en: 'Extras' },
        required: false,
        multiple: true,
        choices: [
          {
            id: 'oc-burger-extra-bacon',
            name: { uk: 'Додатковий бекон', en: 'Extra bacon' },
            priceDelta: 35,
          },
          {
            id: 'oc-burger-extra-cheddar',
            name: { uk: 'Додатковий чедер', en: 'Extra cheddar' },
            priceDelta: 25,
          },
        ],
      },
    ],
  },
  {
    id: 'dish-pulled-pork',
    slug: 'pulled-pork-sandwich',
    relatedDishIds: ['dish-cocktail'],
    categoryId: 'cat-mains',
    name: { uk: 'Сендвіч пул-порк', en: 'Pulled Pork Sandwich' },
    description: {
      uk: 'Тушкована свинина у BBQ-соусі, руколa та мариновані огірки в булці бріош.',
      en: 'BBQ-braised pulled pork with arugula and pickles in a brioche bun.',
    },
    price: 240,
    emoji: '🥪',
    gradient: 'from-orange-400 to-red-600',
    photoUrl: '/dishes/pulled-pork-sandwich.jpg',
    ingredients: [
      {
        id: 'pulled-pork',
        name: { uk: 'тушкована свинина', en: 'pulled pork' },
        icon: 'meat',
      },
      {
        id: 'brioche-bun-pp',
        name: { uk: 'булка бріош', en: 'brioche bun' },
        icon: 'bread',
      },
      {
        id: 'pickles',
        name: { uk: 'мариновані огірки', en: 'pickles' },
        icon: 'generic',
      },
      {
        id: 'arugula-pp',
        name: { uk: 'рукола', en: 'arugula' },
        icon: 'generic',
      },
    ],
  },
  // --- Drinks -----------------------------------------------------------
  {
    id: 'dish-cocktail',
    slug: 'tavern-cocktail',
    relatedDishIds: [],
    categoryId: 'cat-drinks',
    name: { uk: 'Коктейль таверни', en: 'Tavern Cocktail' },
    description: {
      uk: 'Бурбон, вермут та настоянка бітерс з апельсиновою цедрою.',
      en: 'Bourbon, sweet vermouth and bitters, finished with an orange twist.',
    },
    price: 220,
    emoji: '🍸',
    gradient: 'from-red-600 to-rose-900',
    photoUrl: '/dishes/tavern-cocktail.jpg',
    ingredients: [
      { id: 'bourbon', name: { uk: 'бурбон', en: 'bourbon' }, icon: 'generic' },
      {
        id: 'vermouth',
        name: { uk: 'вермут', en: 'vermouth' },
        icon: 'generic',
      },
      { id: 'bitters', name: { uk: 'бітерс', en: 'bitters' }, icon: 'generic' },
    ],
  },
  {
    id: 'dish-wine',
    slug: 'glass-of-white-wine',
    relatedDishIds: [],
    categoryId: 'cat-drinks',
    name: { uk: 'Келих білого вина', en: 'Glass of White Wine' },
    description: {
      uk: 'Сухе біле вино, добре охолоджене.',
      en: 'A well-chilled dry white wine.',
    },
    price: 165,
    emoji: '🥂',
    gradient: 'from-yellow-100 to-lime-300',
    photoUrl: '/dishes/white-wine.jpg',
    ingredients: [],
    optionGroups: [
      {
        id: 'og-wine-volume',
        name: { uk: "Об'єм", en: 'Volume' },
        required: true,
        multiple: false,
        choices: [
          {
            id: 'oc-wine-125',
            name: { uk: '125 мл', en: '125 ml' },
            priceDelta: 0,
          },
          {
            id: 'oc-wine-175',
            name: { uk: '175 мл', en: '175 ml' },
            priceDelta: 45,
          },
          {
            id: 'oc-wine-250',
            name: { uk: '250 мл', en: '250 ml' },
            priceDelta: 90,
          },
        ],
      },
    ],
  },
];

// --- seed -----------------------------------------------------------------

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {
      name: { uk: '1920 Tavern', en: '1920 Tavern' },
      description: {
        uk: "Американська таверна з дров'яною кухнею, фірмовим BBQ та барною картою на основі бурбону.",
        en: 'An American-style tavern with wood-fired cooking, house BBQ, and a bourbon-driven bar.',
      },
      address: {
        uk: 'вул. Хрещатик, 22, Київ',
        en: '22 Khreshchatyk St, Kyiv',
      },
      workingHours: {
        uk: 'Щодня з 12:00 до 00:00',
        en: 'Daily noon – midnight',
      },
      coverPhotoUrl: '/restaurant/cover.jpg',
    },
    create: {
      slug: 'demo-restaurant',
      name: { uk: '1920 Tavern', en: '1920 Tavern' },
      description: {
        uk: "Американська таверна з дров'яною кухнею, фірмовим BBQ та барною картою на основі бурбону.",
        en: 'An American-style tavern with wood-fired cooking, house BBQ, and a bourbon-driven bar.',
      },
      address: {
        uk: 'вул. Хрещатик, 22, Київ',
        en: '22 Khreshchatyk St, Kyiv',
      },
      workingHours: {
        uk: 'Щодня з 12:00 до 00:00',
        en: 'Daily noon – midnight',
      },
      coverPhotoUrl: '/restaurant/cover.jpg',
    },
  });

  // Reuse the existing location/table/staff if this restaurant was seeded
  // before - keeps the table's qrToken and the staff login stable across
  // reseeds, since both are already relied on by bookmarked demo URLs.
  let location = await prisma.location.findFirst({
    where: { restaurantId: restaurant.id },
  });
  if (location) {
    location = await prisma.location.update({
      where: { id: location.id },
      data: { name: '1920 Tavern — Хрещатик' },
    });
  } else {
    location = await prisma.location.create({
      data: {
        restaurantId: restaurant.id,
        name: '1920 Tavern — Хрещатик',
        timezone: 'Europe/Kyiv',
      },
    });
  }

  // Ten demo tables (codes "1".."10") so the Waiter App has enough tables to
  // demo real multi-table workflows (e.g. closing one table while others
  // stay active) instead of a single table standing in for the whole floor.
  // Split across two zones so the Waiter App's floor plan has something real
  // to group by (see Table.zone).
  const tableCodes = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const zoneForCode = (code: string) => (Number(code) <= 6 ? 'Зал' : 'Тераса');
  const tables: Awaited<ReturnType<typeof prisma.table.create>>[] = [];
  for (const code of tableCodes) {
    const zone = zoneForCode(code);
    const existing = await prisma.table.findFirst({
      where: { locationId: location.id, code },
    });
    const seededTable = existing
      ? await prisma.table.update({
          where: { id: existing.id },
          data: { zone },
        })
      : await prisma.table.create({
          data: {
            locationId: location.id,
            code,
            qrToken: crypto.randomUUID(),
            label: `Стіл ${code}`,
            zone,
          },
        });
    tables.push(seededTable);
  }
  const table = tables[0];

  // ADMIN (not just WAITER) so the one demo login can also reach the Admin
  // App - explicit update-or-create rather than `??=` so a reseed against an
  // already-existing (pre-role-field) row still picks up the role.
  const staffEmail = 'waiter@demo.stolikqr.app';
  const existingStaff = await prisma.staffUser.findUnique({
    where: { email: staffEmail },
  });
  const staff = existingStaff
    ? await prisma.staffUser.update({
        where: { id: existingStaff.id },
        data: { role: 'ADMIN' },
      })
    : await prisma.staffUser.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Демо-офіціант',
          email: staffEmail,
          passwordHash: await bcrypt.hash('demo1234', 10),
          role: 'ADMIN',
        },
      });

  // --- Wipe transactional guest activity for this restaurant's table(s) ---
  const tableIds = (
    await prisma.table.findMany({
      where: { locationId: location.id },
      select: { id: true },
    })
  ).map((t) => t.id);

  await prisma.analyticsEvent.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.payment.deleteMany({ where: { tableId: { in: tableIds } } });
  await prisma.orderItem.deleteMany({
    where: { order: { tableId: { in: tableIds } } },
  });
  await prisma.order.deleteMany({ where: { tableId: { in: tableIds } } });
  await prisma.waiterCall.deleteMany({ where: { tableId: { in: tableIds } } });
  await prisma.guestSession.deleteMany({
    where: { tableId: { in: tableIds } },
  });

  // --- Wipe the old menu tree (categories/dishes/modifiers/ingredients) ---
  const oldMenuIds = (
    await prisma.menu.findMany({
      where: { locationId: location.id },
      select: { id: true },
    })
  ).map((m) => m.id);
  const oldCategoryIds = (
    await prisma.category.findMany({
      where: { menuId: { in: oldMenuIds } },
      select: { id: true },
    })
  ).map((c) => c.id);
  const oldDishIds = (
    await prisma.dish.findMany({
      where: { categoryId: { in: oldCategoryIds } },
      select: { id: true },
    })
  ).map((d) => d.id);
  const oldGroupIds = (
    await prisma.modifierGroup.findMany({
      where: { dishId: { in: oldDishIds } },
      select: { id: true },
    })
  ).map((g) => g.id);

  await prisma.recommendation.deleteMany({
    where: {
      OR: [
        { dishId: { in: oldDishIds } },
        { relatedDishId: { in: oldDishIds } },
      ],
    },
  });
  await prisma.dishIngredient.deleteMany({
    where: { dishId: { in: oldDishIds } },
  });
  await prisma.modifierChoice.deleteMany({
    where: { groupId: { in: oldGroupIds } },
  });
  await prisma.modifierGroup.deleteMany({
    where: { dishId: { in: oldDishIds } },
  });
  await prisma.dish.deleteMany({ where: { id: { in: oldDishIds } } });
  await prisma.category.deleteMany({ where: { id: { in: oldCategoryIds } } });
  await prisma.menu.deleteMany({ where: { id: { in: oldMenuIds } } });

  // --- Recreate the menu tree fresh ---
  const menu = await prisma.menu.create({
    data: { locationId: location.id, name: 'Основне меню' },
  });

  const categoryIdByCode = new Map<string, string>();
  for (const [index, cat] of sourceCategories.entries()) {
    const created = await prisma.category.create({
      data: {
        menuId: menu.id,
        slug: cat.slug,
        name: cat.name,
        sortOrder: index,
      },
    });
    categoryIdByCode.set(cat.id, created.id);
  }

  const dishIdByCode = new Map<string, string>();
  for (const [index, dish] of sourceDishes.entries()) {
    const categoryId = categoryIdByCode.get(dish.categoryId);
    if (!categoryId)
      throw new Error(
        `Unknown categoryId ${dish.categoryId} on dish ${dish.id}`,
      );

    const created = await prisma.dish.create({
      data: {
        categoryId,
        slug: dish.slug,
        name: dish.name,
        description: dish.description,
        price: new Prisma.Decimal(dish.price),
        emoji: dish.emoji,
        gradient: dish.gradient,
        photoUrl: dish.photoUrl,
        tags: dish.tags ?? Prisma.JsonNull,
        featured: dish.featured ?? false,
        sortOrder: index,
        ingredients: {
          create: dish.ingredients.map((ing) => ({
            name: ing.name,
            icon: ing.icon,
          })),
        },
        modifierGroups: dish.optionGroups
          ? {
              create: dish.optionGroups.map((group, groupIndex) => ({
                name: group.name,
                required: group.required,
                multiple: group.multiple,
                sortOrder: groupIndex,
                choices: {
                  create: group.choices.map((choice, choiceIndex) => ({
                    name: choice.name,
                    priceDelta: new Prisma.Decimal(choice.priceDelta),
                    exclusive: choice.exclusive ?? false,
                    sortOrder: choiceIndex,
                  })),
                },
              })),
            }
          : undefined,
      },
    });
    dishIdByCode.set(dish.id, created.id);
  }

  for (const dish of sourceDishes) {
    if (!dish.relatedDishIds?.length) continue;
    const dishId = dishIdByCode.get(dish.id)!;
    for (const relatedCode of dish.relatedDishIds) {
      const relatedDishId = dishIdByCode.get(relatedCode);
      if (!relatedDishId) continue;
      await prisma.recommendation.upsert({
        where: { dishId_relatedDishId: { dishId, relatedDishId } },
        update: {},
        create: { dishId, relatedDishId, source: 'MANUAL' },
      });
    }
  }

  console.log('Seed complete:', {
    restaurant: restaurant.slug,
    location: location.name,
    table: table.code,
    qrToken: table.qrToken,
    staff: staff.email,
    categories: categoryIdByCode.size,
    dishes: dishIdByCode.size,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
