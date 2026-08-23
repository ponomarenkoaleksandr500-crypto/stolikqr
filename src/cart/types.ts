import type { LocalizedText } from "@/i18n/types";
import type { Selections } from "@/lib/dishOptions";

export interface CartItem {
  id: string;
  dishId: string;
  dishSlug: string;
  dishName: LocalizedText;
  emoji: string;
  gradient: string;
  unitPrice: number;
  selections: Selections;
  selectionsSummary: LocalizedText;
  /** Ids of base ingredients the guest asked to leave out - never affects unitPrice. */
  excludedIngredientIds: string[];
  excludedIngredientsSummary: LocalizedText;
  optionsKey: string;
  quantity: number;
}
