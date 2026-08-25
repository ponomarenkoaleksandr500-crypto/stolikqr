export interface LocalizedText {
  uk: string;
  en: string;
}

export interface ModifierSnapshotDto {
  groupId: string;
  groupName: LocalizedText;
  choiceId: string;
  choiceName: LocalizedText;
  priceDelta: number;
}

export interface ExcludedIngredientSnapshotDto {
  id: string;
  name: LocalizedText;
}

export interface OrderItemDto {
  id: string;
  dishId: string;
  dishSlug: string;
  name: LocalizedText;
  emoji: string;
  gradient: string;
  basePrice: number;
  modifiers: ModifierSnapshotDto[];
  excludedIngredients: ExcludedIngredientSnapshotDto[];
  selectionsSummary: LocalizedText;
  excludedSummary: LocalizedText;
  quantity: number;
  lineTotal: number;
  status: string;
  createdAt: number;
}

export interface OrderDto {
  id: string;
  tableId: string;
  guestSessionId: string | null;
  status: string;
  createdAt: number;
  paidAt: number | null;
  items: OrderItemDto[];
}

// D8 "Order again": why a given item from the last order couldn't be
// restored as-is. NOT_FOUND - the Dish row is gone; UNAVAILABLE - it still
// exists but Dish.isAvailable is now false; OPTIONS_CHANGED - a modifier
// choice or ingredient the item used no longer exists on the current dish.
export type ReorderSkipReason = 'NOT_FOUND' | 'UNAVAILABLE' | 'OPTIONS_CHANGED';

export interface ReorderSkippedItemDto {
  name: LocalizedText;
  quantity: number;
  reason: ReorderSkipReason;
}

export interface ReorderResultDto {
  order: OrderDto | null;
  skippedItems: ReorderSkippedItemDto[];
}
