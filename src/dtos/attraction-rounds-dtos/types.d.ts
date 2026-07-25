declare type AttractionRoundPaymentSource = "operator" | "client";

declare interface AttractionRoundOperatorPlain {
  id: number | string;

  firstname: string;
  lastname: string;

  phone_number: string;
  telegram_username: string | null;

  role: number | string;
  status: string;

  file: number | string | null;
}

declare interface AttractionRoundOperatorResponseDTO {
  id: number;

  firstname: string;
  lastname: string;

  phone_number: string;
  telegram_username: string | null;

  role: number;
  status: string;

  file: number | null;
}

declare interface AttractionRoundAttractionPlain {
  id: number | string;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | string | null;
  main_file: number | string | null;

  files: Array<number | string>;

  price: number | string;
  duration: number | string;
  seats: number | string;

  age_limit: number | string | null;
  min_height: number | string | null;
  max_weight: number | string | null;

  description: string | null;
}

declare interface AttractionRoundAttractionResponseDTO {
  id: number;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | null;
  main_file: number | null;

  files: number[];

  price: number;
  duration: number;
  seats: number;

  age_limit: number | null;
  min_height: number | null;
  max_weight: number | null;

  description: string | null;
}

declare interface AttractionRoundTransactionCardPlain {
  id: number | string;

  card: string;
  nfc: string;

  type: CardType;
  status: CardStatusTypes;

  balance: number | string;
}

declare interface AttractionRoundTransactionCardResponseDTO {
  id: number;

  card: string;
  nfc: string;

  type: CardType;
  status: CardStatusTypes;

  balance: number;
}

declare interface AttractionRoundTransactionPlain {
  id: number | string;

  card: number | string;
  operator: number | string | null;

  type: CardTransactionType;

  amount: number | string;

  balance_before: number | string;
  balance_after: number | string;

  payment_type: CardTransactionModelI["payment_type"];

  payment_card_type: CardTransactionModelI["payment_card_type"];

  payment_service: CardTransactionModelI["payment_service"];

  people_count: number | string;

  promotion: number | string | null;

  promotion_code: string | null;
  promotion_name: string | null;

  promotion_type: CardTransactionModelI["promotion_type"];

  discount_percent: number | string;

  original_unit_price: number | string;
  sale_unit_price: number | string;

  original_amount: number | string;
  discount_amount: number | string;

  createdAt?: Date;
  created_at?: Date;

  cards?: AttractionRoundTransactionCardPlain | null;
}

declare interface AttractionRoundTransactionResponseDTO {
  id: number;

  transaction_type: CardTransactionType;

  payment_source: AttractionRoundPaymentSource;

  operator: number | null;

  payment_type: CardTransactionModelI["payment_type"];

  payment_card_type: CardTransactionModelI["payment_card_type"];

  payment_service: CardTransactionModelI["payment_service"];

  people_count: number;

  amount: number;

  balance_before: number;
  balance_after: number;

  promotion: number | null;

  promotion_code: string | null;
  promotion_name: string;

  promotion_type: CardTransactionModelI["promotion_type"];

  discount_percent: number;

  original_unit_price: number;
  sale_unit_price: number;

  original_amount: number;
  discount_amount: number;

  card:
    | AttractionRoundTransactionCardResponseDTO
    | {
        id: number;
      };

  created_at: Date | undefined;
}

declare type AttractionRoundWithRelationsPlain = AttractionRoundModelI & {
  operators?: AttractionRoundOperatorPlain | null;

  attractions?: AttractionRoundAttractionPlain | null;

  created_at?: Date;
};

declare interface AttractionRoundResponseDTO {
  id: number;

  report: number;

  attraction: number | AttractionRoundAttractionResponseDTO | null;

  operator: number | AttractionRoundOperatorResponseDTO | null;

  round_number: number;

  status: AttractionRoundStatusTypes;

  people_count: number;

  offline_count: number;
  online_count: number;

  virtual_count: number;
  classic_count: number;

  vip_count: number;
  organization_count: number;

  paid_amount: number;
  total_amount: number;

  started_at: Date;
  finished_at: Date | null;

  created_at: Date | undefined;

  transactions: AttractionRoundTransactionResponseDTO[];
}
