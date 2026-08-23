import type { Locale } from "@/i18n/types";
import type { Dish, OptionGroup } from "@/types/menu";

export type Selections = Record<string, string[]>;

export function initialSelections(dish: Dish): Selections {
  const selections: Selections = {};
  for (const group of dish.optionGroups ?? []) {
    if (!group.multiple && group.required && group.choices.length > 0) {
      selections[group.id] = [group.choices[0].id];
    } else {
      selections[group.id] = [];
    }
  }
  return selections;
}

export function toggleChoice(
  group: OptionGroup,
  choiceId: string,
  current: string[],
): string[] {
  if (!group.multiple) {
    return [choiceId];
  }

  if (current.includes(choiceId)) {
    return current.filter((id) => id !== choiceId);
  }

  const choice = group.choices.find((candidate) => candidate.id === choiceId);
  if (choice?.exclusive) {
    // Selecting an exclusive choice replaces the whole selection.
    return [choiceId];
  }

  // Selecting a regular choice always drops any exclusive choice first,
  // then adds itself to whatever regular choices are already selected.
  const withoutExclusive = current.filter((id) => {
    const candidate = group.choices.find((c) => c.id === id);
    return !candidate?.exclusive;
  });
  return [...withoutExclusive, choiceId];
}

export function computeDishPrice(dish: Dish, selections: Selections): number {
  let total = dish.price;
  for (const group of dish.optionGroups ?? []) {
    const chosenIds = selections[group.id] ?? [];
    for (const choice of group.choices) {
      if (chosenIds.includes(choice.id)) total += choice.priceDelta;
    }
  }
  return total;
}

export function getMissingRequiredGroups(
  dish: Dish,
  selections: Selections,
): OptionGroup[] {
  return (dish.optionGroups ?? []).filter(
    (group) => group.required && (selections[group.id]?.length ?? 0) === 0,
  );
}

export function describeSelections(
  dish: Dish,
  selections: Selections,
  locale: Locale,
): string {
  const parts: string[] = [];
  for (const group of dish.optionGroups ?? []) {
    const chosenIds = selections[group.id] ?? [];
    if (chosenIds.length === 0) continue;
    const choiceNames = group.choices
      .filter((choice) => chosenIds.includes(choice.id))
      .map((choice) => choice.name[locale]);
    if (choiceNames.length === 0) continue;
    parts.push(`${group.name[locale]}: ${choiceNames.join(", ")}`);
  }
  return parts.join(" · ");
}

export function selectionsKey(selections: Selections): string {
  return Object.keys(selections)
    .sort()
    .map((groupId) => `${groupId}:${[...selections[groupId]].sort().join(",")}`)
    .join("|");
}
