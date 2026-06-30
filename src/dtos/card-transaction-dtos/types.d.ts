declare interface UpdateCardResnponseDTO {
  id: number;
  status: string;
}

declare interface ExcelRowData {
  card_id: string;
  nfc_id: string;
}

declare interface CardStatsDto {
  batch: number;
  batchName: string;
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  lost: number;
  frozen: number;
  tethered: number;
}

declare interface CardTransactionResponseDTO {
  id: number;
  nfc: string;
  type: CardTransactionType;
  payment_type: PaymentType | null;
  payment_card_type: PaymentCardType | null;
  payment_service_type: PaymentServiceType | null;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  operator: number;
  cashbox: number;
  xreport: number | null;
  created_at?: Date;
}

declare interface CardTransactionHistoryCardDTO {
  id: number;
  card: string;
  status: string;
}

declare interface CardTransactionHistoryOperatorDTO {
  id: number;
  firstname: string;
  lastname: string;
  file: number | null;
}

declare interface CardTransactionHistoryResponseDTO {
  id: number;

  card: CardTransactionHistoryCardDTO | null;
  operator: CardTransactionHistoryOperatorDTO | null;

  type: CardTransactionType;
  payment_type: PaymentType | null;
  payment_card_type: PaymentCardType | null;
  payment_service_type: PaymentServiceType | null;

  amount: number;
  balance_before: number;
  balance_after: number;

  status: string;
  cashbox: number;
  xreport: number | null;

  created_at?: Date;
}

declare interface CardTransactionsHistoryResponseDTO {
  transactions: CardTransactionHistoryResponseDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type CardTransactionHistoryPlain = CardTransactionModelI & {
  cards?: Partial<CardsModelI> | null;
  operators?: Partial<EmployeeModelI> | null;
};

declare interface CardPaymentTransactionDTO {
  id: number;
  card: number;
  nfc: string;

  operator: number;
  cashbox: number | null;
  attraction: number | null;
  xreport: number | null;

  type: CardTransactionType;
  payment_type: PaymentType | null;
  payment_card_type: PaymentCardType | null;
  payment_service_type: PaymentServiceType | null;

  amount: number;
  balance_before: number;
  balance_after: number;

  status: string;
  created_at?: Date;
}

declare interface CardPaymentResponseDTO {
  paid: boolean;
  message: string;
  transaction: CardPaymentTransactionDTO | null;
}
