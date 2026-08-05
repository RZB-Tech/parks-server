declare type CardReturnCardPlain = Pick<CardsModelI, "id" | "card">;

declare type CardReturnOperatorPlain = Pick<
  EmployeeModelI,
  "id" | "firstname" | "lastname"
>;

declare type CardReturnCashboxPlain = Pick<CashboxModelI, "id" | "name">;

declare type CardReturnListPlain = CardReturnModelI & {
  old_cards?: CardReturnCardPlain | null;
  new_cards?: CardReturnCardPlain | null;
  operators?: CardReturnOperatorPlain | null;
  cashboxes?: CardReturnCashboxPlain | null;
};

declare interface CardReturnCardResponseDTO {
  id: number | null;
  card: string;
}

declare interface CardReturnOperatorResponseDTO {
  id: number;
  firstname: string;
  lastname: string;
}

declare interface CardReturnCashboxResponseDTO {
  id: number;
  name: string;
}

declare interface CardReturnListItemResponseDTO {
  id: number;
  returned_at: Date;
  old_card: CardReturnCardResponseDTO;
  new_card: CardReturnCardResponseDTO;
  amount: number;
  description: string | null;
  operator: CardReturnOperatorResponseDTO | null;
  cashbox: CardReturnCashboxResponseDTO | null;
  xreport: number | null;
  zreport: number | null;
}
