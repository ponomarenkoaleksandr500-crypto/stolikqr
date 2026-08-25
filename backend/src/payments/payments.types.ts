export interface PaymentDto {
  id: string;
  tableId: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: number;
  confirmedAt: number | null;
}

export const PAYMENT_PROVIDER_SETTLED = 'payment.provider.settled';

export interface PaymentProviderSettledEvent {
  providerRef: string;
}
