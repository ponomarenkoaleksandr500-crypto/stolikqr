import { redirect } from "next/navigation";

// Demo Platform v1 is single-tenant (one seeded restaurant, see backend/prisma/seed.ts) -
// no "list restaurants" concept exists yet, so the landing redirect target is
// this fixed slug rather than an API call.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

export default function Home() {
  redirect(`/r/${DEMO_RESTAURANT_SLUG}`);
}
