import type { ComponentType } from "react";
import type { IngredientIcon } from "@/types/menu";

type IconProps = { className?: string };

export function BreadIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 19.5V11.8C4.5 8 7.9 5 12 5s7.5 3 7.5 6.8v7.7" />
      <path d="M4.5 19.5h15" />
      <path d="M9 9.2v4M12 8.3v5.6M15 9.2v4" />
    </svg>
  );
}

export function TomatoIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="14" r="6.5" />
      <path d="M12 7.5c-1.1-1.7-3-2.1-4.5-1.3M12 7.5c1.1-1.7 3-2.1 4.5-1.3M12 7.5V4.3" />
    </svg>
  );
}

export function GarlicIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5v2.3" />
      <path d="M8.3 7.9C8.3 5.7 9.9 4 12 4s3.7 1.7 3.7 3.9c2.1 1.3 3.3 3.6 3.3 6.1 0 4.1-3.1 7.3-7 7.3s-7-3.2-7-7.3c0-2.5 1.2-4.8 3.3-6.1Z" />
      <path d="M12 8.3v11.5M9.2 9.2v9.6M14.8 9.2v9.6" />
    </svg>
  );
}

export function BasilIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20V6" />
      <path d="M12 8.3c-1.9-2.1-4.8-1.9-5.8-.4 1 1.9 3.9 2.5 5.8.8" />
      <path d="M12 8.3c1.9-2.1 4.8-1.9 5.8-.4-1 1.9-3.9 2.5-5.8.8" />
      <path d="M12 13c-1.9-2.1-4.8-1.9-5.8-.4 1 1.9 3.9 2.5 5.8.8" />
      <path d="M12 13c1.9-2.1 4.8-1.9 5.8-.4-1 1.9-3.9 2.5-5.8.8" />
    </svg>
  );
}

export function OliveOilIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.2 3h3.6" />
      <path d="M11 3v3.1L8.6 9.3c-.7.9-1.1 2-1.1 3.2v5.4a3.1 3.1 0 0 0 3.1 3.1h2.8a3.1 3.1 0 0 0 3.1-3.1v-5.4c0-1.2-.4-2.3-1.1-3.2L13 6.1V3" />
      <circle cx="12" cy="15.3" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MeatIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.2 4.3c2.4.2 4.3 2.2 4.3 4.6 0 1.5-.7 2.9-1.9 3.7l-5.3 5.3a2.9 2.9 0 1 1-4.1-4.1l5.3-5.3c.9-.9 1.4-2.1 1.4-3.4 0-.3 0-.6-.1-.8Z" />
      <circle cx="6.8" cy="17.2" r="2.2" />
    </svg>
  );
}

export function CheeseIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.2 18.5 12 5l8.8 13.5Z" />
      <circle cx="11" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="16.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MushroomIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 11.2c0-4 3.6-7.2 8-7.2s8 3.2 8 7.2H4Z" />
      <path d="M9.3 11.2v5.3a2.7 2.7 0 0 0 5.4 0v-5.3" />
    </svg>
  );
}

export function OnionIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5v2.2" />
      <path d="M7.3 9.4C7.3 6.7 9.4 4.5 12 4.5s4.7 2.2 4.7 4.9c1.8 1.3 3 3.5 3 6 0 4-3.5 7.1-7.7 7.1s-7.7-3.1-7.7-7.1c0-2.5 1.2-4.7 3-6Z" />
      <path d="M12 6.6v15.3" />
      <path d="M9.2 20.4l-1 1.7M14.8 20.4l1 1.7" />
    </svg>
  );
}

export function PepperIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.2 4.7c1.1-1 2.6-1.3 3.9-.8" />
      <path d="M9.4 6c4 0 7.2 3.6 7.2 7.9 0 4.1-2.7 7.3-6.2 7.3-3.2 0-5.8-2.7-5.8-6.6 0-3.5 1.9-6.8 4.8-8.6Z" />
    </svg>
  );
}

export function FishIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.7 12.5c3-4.2 8.2-6.3 12.4-4.1 2 1 3.9 2.5 6.2 4.1-2.3 1.6-4.2 3.1-6.2 4.1-4.2 2.2-9.4.1-12.4-4.1Z" />
      <path d="M15.3 8.4l2.9-2.9M15.3 16.6l2.9 2.9" />
      <circle cx="7.2" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SeafoodIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.7 18.4c-1.7-3.3-.3-9.3 4.5-11.9 3.6-1.9 7.4.2 7.7 3.9.3 3.1-1.8 5.3-4.6 6.1" />
      <path d="M17.9 15.9c1 .6 2.1.4 2.9-.5M5.7 18.4c-1 .3-2.1.1-2.8-.7" />
      <circle cx="16.4" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EggIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.3c-3.5 0-6.3 5.2-6.3 9.4a6.3 6.3 0 0 0 12.6 0c0-4.2-2.8-9.4-6.3-9.4Z" />
      <circle cx="12" cy="13.2" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PastaIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.3 17.3c2-1 3.1-3 3-5.3" />
      <path d="M8.6 18c2.4-1.2 3.6-3.8 3.2-6.6" />
      <path d="M13 18.2c2.4-1 3.7-3.5 3.3-6.1" />
      <path d="M17.3 17.6c1.9-1 2.9-2.9 2.6-5" />
      <path d="M4 19.3h16" />
    </svg>
  );
}

export function GenericIngredientIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.8 13.9 10 20 12l-6.1 2 -1.9 6.2 -1.9-6.2L4 12l6.1-2Z" />
    </svg>
  );
}

const INGREDIENT_ICON_REGISTRY: Record<IngredientIcon, ComponentType<IconProps>> = {
  bread: BreadIngredientIcon,
  tomato: TomatoIngredientIcon,
  garlic: GarlicIngredientIcon,
  basil: BasilIngredientIcon,
  oliveOil: OliveOilIngredientIcon,
  meat: MeatIngredientIcon,
  cheese: CheeseIngredientIcon,
  mushroom: MushroomIngredientIcon,
  onion: OnionIngredientIcon,
  pepper: PepperIngredientIcon,
  fish: FishIngredientIcon,
  seafood: SeafoodIngredientIcon,
  egg: EggIngredientIcon,
  pasta: PastaIngredientIcon,
  generic: GenericIngredientIcon,
};

/** Renders the glyph for a given ingredient icon key, falling back to the generic mark. */
export function IngredientGlyph({ icon, className }: { icon: IngredientIcon; className?: string }) {
  const Icon = INGREDIENT_ICON_REGISTRY[icon] ?? GenericIngredientIcon;
  return <Icon className={className} />;
}
