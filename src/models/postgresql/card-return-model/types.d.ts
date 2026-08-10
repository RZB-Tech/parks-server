declare interface CardReturnModelI {
  id: number;
  operator: number | null;
  cashbox: number | null;
  xreport: number | null;
  zreport: number | null;
  old_card: number | null;
  new_card: number | null;
  old_card_number: string;
  new_card_number: string;
  amount: number;
  description: string | null;
  returned_at: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
