// Seed for StolikQR Demo Platform v1.
// Data is transcribed from the existing frontend mock data
// (stolikqr/src/data/{restaurant,categories,dishes}.ts) rather than invented,
// per the fixed Demo Platform v1 architecture doc — the demo restaurant must
// look and behave exactly like what the current Guest App already shows.

import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- source data (transcribed from src/data) ---------------------------------

const sourceCategories = [
  { id: "cat-appetizers", slug: "appetizers", name: { uk: "Закуски", en: "Appetizers" } },
  { id: "cat-mains", slug: "mains", name: { uk: "Основні страви", en: "Main Courses" } },
  { id: "cat-desserts", slug: "desserts", name: { uk: "Десерти", en: "Desserts" } },
  { id: "cat-drinks", slug: "drinks", name: { uk: "Напої", en: "Drinks" } },
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
  tags?: { uk: string[]; en: string[] };
  ingredients: SourceIngredient[];
  optionGroups?: SourceOptionGroup[];
}

const sourceDishes: SourceDish[] = [
  {
    id: "dish-bruschetta",
    slug: "bruschetta",
    relatedDishIds: ["dish-tiramisu", "dish-lemonade"],
    categoryId: "cat-appetizers",
    name: { uk: "Брускети з томатами", en: "Tomato Bruschetta" },
    description: {
      uk: "Хрустка чіабатта з маринованими томатами, часником і базиліком.",
      en: "Crispy ciabatta with marinated tomatoes, garlic and basil.",
    },
    price: 145,
    emoji: "🍅",
    gradient: "from-orange-300 to-red-400",
    tags: { uk: ["вегетаріанське"], en: ["vegetarian"] },
    ingredients: [
      { id: "ciabatta", name: { uk: "чіабатта", en: "ciabatta" }, icon: "bread" },
      { id: "tomatoes", name: { uk: "томати", en: "tomatoes" }, icon: "tomato" },
      { id: "garlic", name: { uk: "часник", en: "garlic" }, icon: "garlic" },
      { id: "basil", name: { uk: "базилік", en: "basil" }, icon: "basil" },
      { id: "olive-oil", name: { uk: "оливкова олія", en: "olive oil" }, icon: "oliveOil" },
    ],
  },
  {
    id: "dish-caesar",
    slug: "caesar-salad",
    relatedDishIds: ["dish-cappuccino", "dish-juice"],
    categoryId: "cat-appetizers",
    name: { uk: "Салат Цезар", en: "Caesar Salad" },
    description: {
      uk: "Класичний салат з листям ромену, пармезаном, грінками та соусом цезар.",
      en: "Classic romaine lettuce salad with parmesan, croutons and Caesar dressing.",
    },
    price: 185,
    emoji: "🥗",
    gradient: "from-lime-300 to-green-500",
    ingredients: [
      { id: "romaine", name: { uk: "ромен", en: "romaine lettuce" }, icon: "generic" },
      { id: "parmesan", name: { uk: "пармезан", en: "parmesan" }, icon: "cheese" },
      { id: "croutons", name: { uk: "грінки", en: "croutons" }, icon: "bread" },
      { id: "caesar-dressing", name: { uk: "соус цезар", en: "caesar dressing" }, icon: "generic" },
    ],
    optionGroups: [
      {
        id: "og-caesar-protein",
        name: { uk: "Білок", en: "Protein" },
        required: false,
        multiple: false,
        choices: [
          { id: "oc-none", name: { uk: "Без білка", en: "No protein" }, priceDelta: 0 },
          { id: "oc-chicken", name: { uk: "Курка", en: "Chicken" }, priceDelta: 45 },
          { id: "oc-shrimp", name: { uk: "Креветки", en: "Shrimp" }, priceDelta: 70 },
        ],
      },
    ],
  },
  {
    id: "dish-margherita",
    slug: "margherita-pizza",
    featured: true,
    relatedDishIds: ["dish-tiramisu", "dish-cappuccino"],
    categoryId: "cat-mains",
    name: { uk: "Піца Маргарита", en: "Margherita Pizza" },
    description: {
      uk: "Томатний соус, моцарела, свіжий базилік на тонкому тісті.",
      en: "Tomato sauce, mozzarella, fresh basil on a thin crust.",
    },
    price: 220,
    emoji: "🍕",
    gradient: "from-yellow-300 to-orange-500",
    ingredients: [
      { id: "dough", name: { uk: "тісто", en: "dough" }, icon: "bread" },
      { id: "tomato-sauce", name: { uk: "томатний соус", en: "tomato sauce" }, icon: "tomato" },
      { id: "mozzarella", name: { uk: "моцарела", en: "mozzarella" }, icon: "cheese" },
      { id: "basil", name: { uk: "базилік", en: "basil" }, icon: "basil" },
    ],
    optionGroups: [
      {
        id: "og-pizza-size",
        name: { uk: "Розмір", en: "Size" },
        required: true,
        multiple: false,
        choices: [
          { id: "oc-25", name: { uk: "25 см", en: "25 cm" }, priceDelta: 0 },
          { id: "oc-30", name: { uk: "30 см", en: "30 cm" }, priceDelta: 60 },
          { id: "oc-35", name: { uk: "35 см", en: "35 cm" }, priceDelta: 120 },
        ],
      },
      {
        id: "og-pizza-extras",
        name: { uk: "Додатки", en: "Extras" },
        required: false,
        multiple: true,
        choices: [
          { id: "oc-mozzarella", name: { uk: "Додаткова моцарела", en: "Extra mozzarella" }, priceDelta: 35 },
          { id: "oc-mushrooms", name: { uk: "Гриби", en: "Mushrooms" }, priceDelta: 30 },
          { id: "oc-olives", name: { uk: "Оливки", en: "Olives" }, priceDelta: 25 },
        ],
      },
    ],
  },
  {
    id: "dish-burger",
    slug: "classic-burger",
    featured: true,
    relatedDishIds: ["dish-lemonade", "dish-cheesecake"],
    categoryId: "cat-mains",
    name: { uk: "Бургер Класичний", en: "Classic Burger" },
    description: {
      uk: "Соковита яловича котлета, чедер, свіжі овочі та фірмовий соус у булці бріош.",
      en: "Juicy beef patty, cheddar, fresh vegetables and house sauce in a brioche bun.",
    },
    price: 210,
    emoji: "🍔",
    gradient: "from-amber-400 to-rose-500",
    ingredients: [
      { id: "brioche-bun", name: { uk: "булка бріош", en: "brioche bun" }, icon: "bread" },
      { id: "beef-patty", name: { uk: "яловича котлета", en: "beef patty" }, icon: "meat" },
      { id: "cheddar", name: { uk: "чедер", en: "cheddar" }, icon: "cheese" },
      { id: "lettuce", name: { uk: "салат", en: "lettuce" }, icon: "generic" },
      { id: "tomato", name: { uk: "томати", en: "tomato" }, icon: "tomato" },
      { id: "house-sauce", name: { uk: "фірмовий соус", en: "house sauce" }, icon: "generic" },
    ],
    optionGroups: [
      {
        id: "og-burger-doneness",
        name: { uk: "Ступінь прожарки", en: "Doneness" },
        required: true,
        multiple: false,
        choices: [
          { id: "oc-medium", name: { uk: "Medium", en: "Medium" }, priceDelta: 0 },
          { id: "oc-well-done", name: { uk: "Well done", en: "Well done" }, priceDelta: 0 },
        ],
      },
      {
        id: "og-burger-extras",
        name: { uk: "Додатки", en: "Extras" },
        required: false,
        multiple: true,
        choices: [
          { id: "oc-bacon", name: { uk: "Бекон", en: "Bacon" }, priceDelta: 35 },
          { id: "oc-cheddar", name: { uk: "Додатковий чедер", en: "Extra cheddar" }, priceDelta: 25 },
          { id: "oc-onion", name: { uk: "Смажена цибуля", en: "Fried onion" }, priceDelta: 20 },
        ],
      },
    ],
  },
  {
    id: "dish-carbonara",
    slug: "carbonara",
    relatedDishIds: ["dish-tiramisu", "dish-juice"],
    categoryId: "cat-mains",
    name: { uk: "Паста Карбонара", en: "Pasta Carbonara" },
    description: {
      uk: "Спагеті з беконом, пармезаном та вершковим соусом на основі яйця.",
      en: "Spaghetti with bacon, parmesan and a creamy egg-based sauce.",
    },
    price: 195,
    emoji: "🍝",
    gradient: "from-yellow-200 to-amber-400",
    ingredients: [
      { id: "spaghetti", name: { uk: "спагеті", en: "spaghetti" }, icon: "pasta" },
      { id: "bacon", name: { uk: "бекон", en: "bacon" }, icon: "meat" },
      { id: "parmesan", name: { uk: "пармезан", en: "parmesan" }, icon: "cheese" },
      { id: "egg", name: { uk: "яйце", en: "egg" }, icon: "egg" },
      { id: "black-pepper", name: { uk: "чорний перець", en: "black pepper" }, icon: "generic" },
    ],
  },
  {
    id: "dish-tiramisu",
    slug: "tiramisu",
    featured: true,
    relatedDishIds: ["dish-cappuccino"],
    categoryId: "cat-desserts",
    name: { uk: "Тірамісу", en: "Tiramisu" },
    description: {
      uk: "Ніжний десерт із маскарпоне, кавовим сиропом та какао.",
      en: "A delicate dessert with mascarpone, coffee syrup and cocoa.",
    },
    price: 135,
    emoji: "🍰",
    gradient: "from-amber-300 to-yellow-600",
    tags: { uk: ["вегетаріанське"], en: ["vegetarian"] },
    ingredients: [
      { id: "mascarpone", name: { uk: "маскарпоне", en: "mascarpone" }, icon: "cheese" },
      { id: "ladyfingers", name: { uk: "савоярді", en: "ladyfingers" }, icon: "bread" },
      { id: "coffee", name: { uk: "кава", en: "coffee" }, icon: "generic" },
      { id: "cocoa", name: { uk: "какао", en: "cocoa" }, icon: "generic" },
    ],
  },
  {
    id: "dish-cheesecake",
    slug: "new-york-cheesecake",
    relatedDishIds: ["dish-cappuccino", "dish-lemonade"],
    categoryId: "cat-desserts",
    name: { uk: "Чізкейк Нью-Йорк", en: "New York Cheesecake" },
    description: {
      uk: "Класичний вершковий чізкейк на пісочній основі.",
      en: "Classic creamy cheesecake on a shortbread base.",
    },
    price: 150,
    emoji: "🍮",
    gradient: "from-orange-200 to-amber-500",
    ingredients: [
      { id: "cream-cheese", name: { uk: "вершковий сир", en: "cream cheese" }, icon: "cheese" },
      { id: "shortbread-base", name: { uk: "пісочна основа", en: "shortbread base" }, icon: "bread" },
      { id: "sour-cream", name: { uk: "сметана", en: "sour cream" }, icon: "generic" },
    ],
    optionGroups: [
      {
        id: "og-cheesecake-topping",
        name: { uk: "Топінг", en: "Topping" },
        required: false,
        multiple: true,
        choices: [
          { id: "oc-no-topping", name: { uk: "Без топінгу", en: "No topping" }, priceDelta: 0, exclusive: true },
          { id: "oc-berry", name: { uk: "Ягідний соус", en: "Berry sauce" }, priceDelta: 20 },
          { id: "oc-caramel", name: { uk: "Карамель", en: "Caramel" }, priceDelta: 20 },
        ],
      },
    ],
  },
  {
    id: "dish-lemonade",
    slug: "homemade-lemonade",
    relatedDishIds: ["dish-bruschetta"],
    categoryId: "cat-drinks",
    name: { uk: "Лимонад домашній", en: "Homemade Lemonade" },
    description: {
      uk: "Освіжний лимонад із м'ятою та лаймом власного приготування.",
      en: "Refreshing house-made lemonade with mint and lime.",
    },
    price: 85,
    emoji: "🍋",
    gradient: "from-lime-200 to-yellow-400",
    ingredients: [
      { id: "lemon", name: { uk: "лимон", en: "lemon" }, icon: "generic" },
      { id: "lime", name: { uk: "лайм", en: "lime" }, icon: "generic" },
      { id: "mint", name: { uk: "м'ята", en: "mint" }, icon: "basil" },
      { id: "soda-water", name: { uk: "содова вода", en: "soda water" }, icon: "generic" },
    ],
    optionGroups: [
      {
        id: "og-lemonade-volume",
        name: { uk: "Об'єм", en: "Volume" },
        required: true,
        multiple: false,
        choices: [
          { id: "oc-300", name: { uk: "300 мл", en: "300 ml" }, priceDelta: 0 },
          { id: "oc-500", name: { uk: "500 мл", en: "500 ml" }, priceDelta: 25 },
        ],
      },
      {
        id: "og-lemonade-ice",
        name: { uk: "Лід", en: "Ice" },
        required: false,
        multiple: true,
        choices: [{ id: "oc-ice", name: { uk: "Лід", en: "Ice" }, priceDelta: 0 }],
      },
    ],
  },
  {
    id: "dish-cappuccino",
    slug: "cappuccino",
    relatedDishIds: ["dish-tiramisu", "dish-cheesecake"],
    categoryId: "cat-drinks",
    name: { uk: "Капучіно", en: "Cappuccino" },
    description: { uk: "Еспресо з ніжною молочною піною.", en: "Espresso with delicate steamed milk foam." },
    price: 75,
    emoji: "☕",
    gradient: "from-amber-500 to-stone-700",
    ingredients: [
      { id: "espresso", name: { uk: "еспресо", en: "espresso" }, icon: "generic" },
      { id: "milk", name: { uk: "молоко", en: "milk" }, icon: "generic" },
    ],
    optionGroups: [
      {
        id: "og-cappuccino-size",
        name: { uk: "Об'єм", en: "Volume" },
        required: true,
        multiple: false,
        choices: [
          { id: "oc-s", name: { uk: "S", en: "S" }, priceDelta: 0 },
          { id: "oc-m", name: { uk: "M", en: "M" }, priceDelta: 15 },
          { id: "oc-l", name: { uk: "L", en: "L" }, priceDelta: 25 },
        ],
      },
      {
        id: "og-cappuccino-milk",
        name: { uk: "Молоко", en: "Milk" },
        required: false,
        multiple: false,
        choices: [
          { id: "oc-regular", name: { uk: "Звичайне", en: "Regular" }, priceDelta: 0 },
          { id: "oc-almond", name: { uk: "Мигдальне", en: "Almond" }, priceDelta: 15 },
          { id: "oc-oat", name: { uk: "Вівсяне", en: "Oat" }, priceDelta: 15 },
        ],
      },
    ],
  },
  {
    id: "dish-juice",
    slug: "fresh-juice",
    relatedDishIds: ["dish-caesar"],
    categoryId: "cat-drinks",
    name: { uk: "Свіжовичавлений сік", en: "Fresh Juice" },
    description: { uk: "Апельсиновий сік свіжого віджиму, без цукру.", en: "Freshly squeezed orange juice, no added sugar." },
    price: 95,
    emoji: "🍊",
    gradient: "from-orange-300 to-orange-600",
    ingredients: [{ id: "oranges", name: { uk: "апельсини", en: "oranges" }, icon: "generic" }],
  },
];

// --- seed -----------------------------------------------------------------

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      slug: "demo-restaurant",
      name: { uk: "Bella Vista", en: "Bella Vista" },
      description: {
        uk: "Затишний ресторан із сучасною європейською кухнею та відкритою кухнею на очах у гостей.",
        en: "A cozy restaurant with modern European cuisine and an open kitchen.",
      },
      address: { uk: "вул. Хрещатик, 22, Київ", en: "22 Khreshchatyk St, Kyiv" },
      workingHours: { uk: "Щодня з 10:00 до 23:00", en: "Daily 10:00 AM – 11:00 PM" },
    },
  });

  const location = await prisma.location.create({
    data: { restaurantId: restaurant.id, name: "Bella Vista — Хрещатик", timezone: "Europe/Kyiv" },
  });

  const table = await prisma.table.create({
    data: {
      locationId: location.id,
      code: "1",
      qrToken: crypto.randomUUID(),
      label: "Стіл 1",
    },
  });

  const staff = await prisma.staffUser.create({
    data: {
      restaurantId: restaurant.id,
      name: "Демо-офіціант",
      email: "waiter@demo.stolikqr.app",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const menu = await prisma.menu.create({
    data: { locationId: location.id, name: "Основне меню" },
  });

  const categoryIdByCode = new Map<string, string>();
  for (const [index, cat] of sourceCategories.entries()) {
    const created = await prisma.category.create({
      data: { menuId: menu.id, slug: cat.slug, name: cat.name, sortOrder: index },
    });
    categoryIdByCode.set(cat.id, created.id);
  }

  const dishIdByCode = new Map<string, string>();
  for (const [index, dish] of sourceDishes.entries()) {
    const categoryId = categoryIdByCode.get(dish.categoryId);
    if (!categoryId) throw new Error(`Unknown categoryId ${dish.categoryId} on dish ${dish.id}`);

    const created = await prisma.dish.create({
      data: {
        categoryId,
        slug: dish.slug,
        name: dish.name,
        description: dish.description,
        price: new Prisma.Decimal(dish.price),
        emoji: dish.emoji,
        gradient: dish.gradient,
        tags: dish.tags ?? Prisma.JsonNull,
        featured: dish.featured ?? false,
        sortOrder: index,
        ingredients: {
          create: dish.ingredients.map((ing) => ({ name: ing.name, icon: ing.icon })),
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
        create: { dishId, relatedDishId, source: "MANUAL" },
      });
    }
  }

  console.log("Seed complete:", {
    restaurant: restaurant.slug,
    location: location.name,
    table: table.code,
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
