declare interface CardsModelI {
  id: number;
  user: number | null;
  batch: number;
  card: string;
  nfc: string;
  status: import("./enums").CardStatusTypes;
  type: import("./enums").CardType;
  balance: number;
  imported_at: DATE;
  activated_at: DATE | null;
}
