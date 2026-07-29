declare interface PaymentOrderModelI {
  id: number;

  user: number;
  card: number;

  provider: import("./enums").PaymentProviderTypes;
  purpose: import("./enums").PaymentOrderPurposeTypes;
  status: import("./enums").PaymentOrderStatusTypes;

  /*
   * Card balansiga tushadigan va provider orqali to‘lanadigan summa.
   * Payme Merchant API bu qiymatni tiyinlarda yuboradi: amount * 100.
   */
  amount: number;

  expires_at: Date | null;
  performed_at: Date | null;
  cancelled_at: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}
