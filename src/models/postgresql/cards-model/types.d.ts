declare interface CardsModelI {
  id: number;
  user: number | null;
  batch: number;
  card: string;
  nfc: string;
  bind_token_hash: string | null;
  status: import("./enums").CardStatusTypes;
  type: import("./enums").CardType;
  balance: number;
  imported_at: DATE;
  activated_at: DATE | null;
  bound_at: DATE | null;
  returned_at: DATE | null;
  return_description: string | null;
}
