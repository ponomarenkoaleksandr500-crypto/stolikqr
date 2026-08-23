import { redirect } from "next/navigation";
import { restaurant } from "@/data/restaurant";

export default function Home() {
  redirect(`/r/${restaurant.slug}`);
}
