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
