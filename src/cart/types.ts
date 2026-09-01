import type { LocalizedText } from "@/i18n/types";
import type { Selections } from "@/lib/dishOptions";

export interface CartItem {
  id: string;
  dishId: string;
  dishSlug: string;
  dishName: LocalizedText;
  /** Real dish photo, so the cart shows food rather than a stand-in. Optional: carts persisted before this field existed rehydrate without it. */
  photoUrl?: string;
  /** Legacy, no longer rendered (DEC-002 §3). Kept so stored carts stay valid. */
  emoji: string;
  /** Legacy, no longer rendered (DEC-002 §3). Kept so stored carts stay valid. */
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
