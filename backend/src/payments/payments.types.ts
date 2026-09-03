export interface PaymentDto {
  id: string;
  tableId: string;
  provider: string;
  /** DEMO when no real money moved. Carried out to every client so a guest
   *  or a waiter is never shown a settlement that looks real and is not. */
  mode: string;
  amount: number;
  status: string;
  createdAt: number;
  confirmedAt: number | null;
}

export const PAYMENT_PROVIDER_SETTLED = 'payment.provider.settled';

export interface PaymentProviderSettledEvent {
  providerRef: string;
}
