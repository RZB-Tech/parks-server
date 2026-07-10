declare interface CardResponseDTO {
  id: number;
  batch: string | null;
  type: CardType;
  card: string;
  nfc: string;
  balance: number;
  status: string;
  imported_at: Date;
  activated_at: Date | null;
  last_transaction?: ReturnType<typeof CardLastTransactionDTO>;
}

declare interface UpdateCardResnponseDTO {
  id: number;
  status: string;
}

declare interface ExcelRowData {
  card_id: string;
  nfc_id: string;
}

declare interface CardStatsDto {
  batch: number;
  batchName: string;
  type: CardType;
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  lost: number;
  frozen: number;
  tethered: number;
}

declare interface CardWithTransactionDto extends CardsModelI {
  batches?: CardBatchShortDto | null;
  transaction?: CardTransactionModelI | null;
}

declare interface CardBatchShortDto {
  id: number;
  name: string;
  type?: CardType;
}

declare interface CardTypeStatsDTO {
  total: number;
  classic: number;
  vip: number;
  organization: number;
}

declare interface CardsDashboardStatsDTO {
  total_cards: CardTypeStatsDTO;
  active_cards: CardTypeStatsDTO;
  inactive_cards: CardTypeStatsDTO;
  blocked_lost_cards: {
    total: number;
  };
}

declare interface CardsPaginationResponseDTO {
  cards: CardResponseDTO[];
  stats?: CardsDashboardStatsDTO;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare interface CardBatchStatsRaw {
  type: CardType;
  total_cards: string | number | null;
  active_cards: string | number | null;
  inactive_cards: string | number | null;
  blocked_cards: string | number | null;
  lost_cards: string | number | null;
}
