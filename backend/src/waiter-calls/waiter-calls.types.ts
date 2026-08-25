export interface WaiterCallDto {
  id: string;
  tableId: string;
  guestSessionId: string | null;
  reasonKey: string;
  status: string;
  calledAt: number;
  acceptedAt: number | null;
  inProgressAt: number | null;
  completedAt: number | null;
}
