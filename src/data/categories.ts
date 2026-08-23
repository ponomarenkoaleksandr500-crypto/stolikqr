import type { Category } from "@/types/menu";

export const categories: Category[] = [
  {
    id: "cat-appetizers",
    slug: "appetizers",
    name: { uk: "Закуски", en: "Appetizers" },
  },
  {
    id: "cat-mains",
    slug: "mains",
    name: { uk: "Основні страви", en: "Main Courses" },
  },
  {
    id: "cat-desserts",
    slug: "desserts",
    name: { uk: "Десерти", en: "Desserts" },
  },
  {
    id: "cat-drinks",
    slug: "drinks",
    name: { uk: "Напої", en: "Drinks" },
  },
];
