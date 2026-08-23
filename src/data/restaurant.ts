import type { Restaurant } from "@/types/menu";

export const restaurant: Restaurant = {
  id: "rest-1",
  slug: "demo-restaurant",
  name: {
    uk: "Bella Vista",
    en: "Bella Vista",
  },
  description: {
    uk: "Затишний ресторан із сучасною європейською кухнею та відкритою кухнею на очах у гостей.",
    en: "A cozy restaurant with modern European cuisine and an open kitchen.",
  },
  address: {
    uk: "вул. Хрещатик, 22, Київ",
    en: "22 Khreshchatyk St, Kyiv",
  },
  workingHours: {
    uk: "Щодня з 10:00 до 23:00",
    en: "Daily 10:00 AM – 11:00 PM",
  },
};
