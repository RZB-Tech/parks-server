declare interface CardsModelI {
  id: number;
  batch: number;
  card: string;
  nfc: string;
  status: import("./enums").CardStatusTypes;
  imported_at: DATE;
  activated_at: DATE | null;
}
