declare interface CardTransactionModelI {
  id: number;

  card: number;

  operator: number | null;
  cashbox: number | null;
  attraction: number | null;
  xreport: number | null;
  cashbox_report: number | null;

  type: CardTransactionType;

  amount: number;
  balance_before: number;
  balance_after: number;
  activation_amount: number;
  description: string | null;

  promotion: number | null;

  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  discount_percent: number;

  people_count: number;

  original_unit_price: number;
  sale_unit_price: number;

  original_amount: number;
  discount_amount: number;

  payment_type: PaymentType;
  payment_card_type: PaymentCardType | null;
  payment_service: PaymentServiceType | null;

  status: CardTransactionStatusTypes;
  
  createdAt?: Date;
}
