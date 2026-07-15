declare interface CardBatchModelI {
  id: number;
  name: string;
  type?: CardType;
  total_cards: number;
  inactive_cards: number;
  active_cards: number;
  frozen_cards: number;
  blocked_cards: number;
  lost_cards: number;
  tethered_cards: number;
  imported_by: number | null;
  imported_at: Date;
}
