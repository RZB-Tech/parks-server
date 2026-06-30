declare interface AttractionReportDto {
  id: number;
  attraction: number;
  operator: number;
  status: AttractionReportStatusTypes;
  opened_at: Date;
  closed_at: Date | null;
  total_rounds: number;
  total_people: number;
  paid_amount: number;
  total_amount: number;
  created_at?: Date;
}

declare interface PaymentAttractionPlain {
  id: number | string;
  name: string;
  price: number | string;
  seats: number | string;
}

declare interface PaymentOperatorAttractionData extends AttractionOperatorModelI {
  attractions: PaymentAttractionPlain;
}