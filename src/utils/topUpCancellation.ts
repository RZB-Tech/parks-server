import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "../models/postgresql/card-transactions-model/enums";
import { CashboxReportStatusTypes } from "../models/postgresql/cashbox-report-model/enums";

export type TopUpCancellationCandidate = {
  type: CardTransactionType;
  status: CardTransactionStatusTypes;
  payment_type: PaymentType;
  payment_card_type?: PaymentCardType | null;
  payment_service?: PaymentServiceType | null;
  amount: number;
  activation_amount: number;
};

export const GetTopUpCancellationBlockReason = (
  transaction: TopUpCancellationCandidate,
  cardBalance: number,
  zReportStatus?: CashboxReportStatusTypes | null,
): string | null => {
  if (transaction.type !== CardTransactionType.TOPUP) {
    return "TRANSACTION_IS_NOT_TOPUP";
  }

  if (transaction.status !== CardTransactionStatusTypes.SUCCESS) {
    return "TOPUP_IS_NOT_ACTIVE";
  }

  if (transaction.payment_type === PaymentType.ONLINE) {
    return "ONLINE_TOPUP_REQUIRES_PROVIDER_REFUND";
  }

  if (Number(transaction.activation_amount || 0) > 0) {
    return "ACTIVATION_TOPUP_CANNOT_BE_CANCELLED";
  }

  const amount = Number(transaction.amount);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(cardBalance) ||
    cardBalance < amount
  ) {
    return "CARD_BALANCE_IS_INSUFFICIENT";
  }

  if (!zReportStatus) {
    return "Z_REPORT_NOT_FOUND";
  }

  if (
    [
      CashboxReportStatusTypes.CONFIRMED,
      CashboxReportStatusTypes.CANCELLED,
    ].includes(zReportStatus)
  ) {
    return "Z_REPORT_IS_FINALIZED";
  }

  return null;
};

export const GetTopUpReportAmounts = (
  transaction: TopUpCancellationCandidate,
): Record<string, number> => {
  const amount = Number(transaction.amount);
  const values: Record<string, number> = {
    total_amount: amount,
  };

  if (transaction.payment_type === PaymentType.CASH) {
    values.cash_amount = amount;
  }

  if (transaction.payment_type === PaymentType.CARD) {
    values.card_amount = amount;

    if (transaction.payment_card_type === PaymentCardType.UZCARD) {
      values.uzcard_amount = amount;
    }

    if (transaction.payment_card_type === PaymentCardType.HUMO) {
      values.humo_amount = amount;
    }
  }

  if (transaction.payment_type === PaymentType.ONLINE) {
    values.online_amount = amount;

    if (transaction.payment_service === PaymentServiceType.ONEQR) {
      values.oneqr_amount = amount;
    }

    if (transaction.payment_service === PaymentServiceType.UZUM) {
      values.uzum_amount = amount;
    }

    if (transaction.payment_service === PaymentServiceType.PAYME) {
      values.payme_amount = amount;
    }

    if (transaction.payment_service === PaymentServiceType.CLICK) {
      values.click_amount = amount;
    }
  }

  return values;
};
