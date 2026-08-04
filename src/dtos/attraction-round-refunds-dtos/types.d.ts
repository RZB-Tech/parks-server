declare type AttractionRoundRefundTransactionPlain = Pick<
  CardTransactionModelI,
  | "id"
  | "type"
  | "status"
  | "amount"
  | "people_count"
  | "balance_before"
  | "balance_after"
  | "payment_type"
  | "payment_card_type"
  | "payment_service"
  | "promotion"
  | "attraction_tariff"
  | "tariff_name"
  | "createdAt"
>;

declare interface AttractionRoundRefundTransactionResponseDTO {
  id: number;
  type: CardTransactionModelI["type"];
  status: CardTransactionModelI["status"];
  amount: number;
  people_count: number;
  balance_before: number;
  balance_after: number;
  payment_type: CardTransactionModelI["payment_type"];
  payment_card_type: CardTransactionModelI["payment_card_type"];
  payment_service_type: CardTransactionModelI["payment_service"];
  promotion: number | null;
  attraction_tariff: number | null;
  tariff_name: string | null;
  created_at: Date | null;
}

declare type AttractionRoundRefundRoundPlain = Pick<
  AttractionRoundModelI,
  "id" | "round_number" | "status" | "started_at" | "finished_at"
>;

declare interface AttractionRoundRefundRoundResponseDTO {
  id: number;
  round_number: number;
  status: AttractionRoundModelI["status"];
  started_at: Date;
  finished_at: Date | null;
}

declare type AttractionRoundRefundAttractionPlain = Pick<
  AttractionModelI,
  "id" | "name"
>;

declare interface AttractionRoundRefundAttractionResponseDTO {
  id: number;
  name: string;
}

declare type AttractionRoundRefundOperatorPlain = Pick<
  EmployeeModelI,
  "id" | "firstname" | "lastname"
>;

declare interface AttractionRoundRefundOperatorResponseDTO {
  id: number;
  firstname: string;
  lastname: string;
}

declare type AttractionRoundRefundCardPlain = Pick<
  CardsModelI,
  "id" | "card" | "nfc" | "type" | "status"
>;

declare interface AttractionRoundRefundCardResponseDTO {
  id: number;
  card_number: string;
  nfc: string;
  type: CardsModelI["type"];
  status: CardsModelI["status"];
}

declare type AttractionRoundRefundListPlain = AttractionRoundRefundModelI & {
  rounds?: AttractionRoundRefundRoundPlain | null;
  attractions?: AttractionRoundRefundAttractionPlain | null;
  operators?: AttractionRoundRefundOperatorPlain | null;
  cards?: AttractionRoundRefundCardPlain | null;
  original_transactions?: AttractionRoundRefundTransactionPlain | null;
  refund_transactions?: AttractionRoundRefundTransactionPlain | null;
};

declare interface AttractionRoundRefundListItemResponseDTO {
  id: number;
  amount: number;
  people_count: number;
  description: string;
  refunded_at: Date | null;
  round: AttractionRoundRefundRoundResponseDTO | null;
  attraction: AttractionRoundRefundAttractionResponseDTO | null;
  operator: AttractionRoundRefundOperatorResponseDTO | null;
  card: AttractionRoundRefundCardResponseDTO | null;
  original_transaction: AttractionRoundRefundTransactionResponseDTO | null;
  refund_transaction: AttractionRoundRefundTransactionResponseDTO | null;
}

declare interface AttractionRoundRefundsPaginationPlain {
  total: number;
  page: number;
  limit: number;
}

declare interface GetAttractionRoundRefundsResponseDTO {
  refunds: AttractionRoundRefundListItemResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare interface CreatedAttractionRoundRefundTransactionPlain {
  id: number | string;
  original_transaction: number | string;
  amount: number | string;
  people_count: number | string;
}

declare interface CreatedAttractionRoundRefundCardPlain {
  id: number | string;
  balance_before: number | string;
  balance_after: number | string;
}

declare interface CreatedAttractionRoundRefundPlain {
  round: number | string;
  attraction: number | string;
  refunded_amount: number | string;
  refunded_people: number | string;
  original_transaction_ids: Array<number | string>;
  refund_transactions: CreatedAttractionRoundRefundTransactionPlain[];
  card: CreatedAttractionRoundRefundCardPlain;
  description: string;
}

declare interface CreatedAttractionRoundRefundTransactionResponseDTO {
  id: number;
  original_transaction: number;
  amount: number;
  people_count: number;
}

declare interface CreatedAttractionRoundRefundCardResponseDTO {
  id: number;
  balance_before: number;
  balance_after: number;
}

declare interface AttractionRoundRefundResponseDTO {
  round: number;
  attraction: number;
  refunded_amount: number;
  refunded_people: number;
  original_transaction_ids: number[];
  refund_transactions: CreatedAttractionRoundRefundTransactionResponseDTO[];
  card: CreatedAttractionRoundRefundCardResponseDTO;
  description: string;
}
