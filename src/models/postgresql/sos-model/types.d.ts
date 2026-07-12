declare interface SosModelI {
  id: number;
  attraction_operator: number | null;
  cashbox_operator: number | null;
  description: string;
  fixed_at: DATE | null;
  createdAt?: DATE;
}
