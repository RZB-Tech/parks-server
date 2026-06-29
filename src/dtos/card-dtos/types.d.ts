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
