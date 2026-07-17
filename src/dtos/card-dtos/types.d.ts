declare interface CardUserDto {
  id: number;
  fullname: string;
  phone_number: string;
  status: UserStatusTypes;
}

declare interface CardResponseDTO {
  id: number;
  batch: string | null;
  type: CardType;
  card: string;
  nfc: string;
  balance: number;
  status: CardStatusTypes;
  imported_at: Date;
  activated_at: Date | null;

  user: CardUserDto | null;

  last_transaction?: CardLastTransactionResponseDTO;
}

declare interface CardWithTransactionDto extends CardsModelI {
  batches?: CardBatchShortDto | null;
  users?: CardUserDto | null;
  transaction?: CardTransactionModelI | null;
}

declare interface CardBatchShortDto {
  id: number;
  name: string;
  type?: CardType;
}

declare interface SendCardRelationOtpResponseDTO {
  phone_number: string;
  expires_in: number;
  resend_in: number;
  remaining_send_attempts: number;
}
