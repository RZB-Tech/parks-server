import { CardLastTransactionDTO } from "../card-transaction-dtos/CardTransactionDto";

export const CardDTO = (data: CardWithTransactionDto): CardResponseDTO => {
  const lastTransaction = data.transaction ?? null;
  const user = data.users ?? null;

  return {
    id: Number(data.id),
    batch: data.batches?.name ?? null,
    type: data.type,
    card: data.card,
    nfc: data.nfc,
    balance: Number(data.balance || 0),
    status: data.status,
    imported_at: data.imported_at,
    activated_at: data.activated_at,

    user: user
      ? {
          id: Number(user.id),
          fullname: user.fullname,
          phone_number: user.phone_number,
          status: user.status,
        }
      : null,

    ...(lastTransaction
      ? {
          last_transaction: CardLastTransactionDTO(lastTransaction),
        }
      : {}),
  };
};
export const UpdateCardDTO = (data: CardsModelI): UpdateCardResnponseDTO => {
  return {
    id: Number(data.id),
    status: data.status,
  };
};

export const CardStatsDTO = (data: CardBatchModelI): CardStatsDto => {
  return {
    batch: Number(data.id || 0),
    batchName: data.name,
    total: Number(data.total_cards || 0),
    active: Number(data.active_cards || 0),
    inactive: Number(data.inactive_cards || 0),
    blocked: Number(data.blocked_cards || 0),
    lost: Number(data.lost_cards || 0),
    frozen: Number(data.frozen_cards || 0),
    tethered: Number(data.tethered_cards || 0),
  };
};

export const SendCardRelationOtpDTO = (
  data: SendCardRelationOtpResponseDTO,
): SendCardRelationOtpResponseDTO => {
  return {
    phone_number: data.phone_number,
    expires_in: Number(data.expires_in),
    resend_in: Number(data.resend_in),
    remaining_send_attempts: Number(data.remaining_send_attempts),
  };
};