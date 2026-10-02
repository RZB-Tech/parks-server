import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "../models/postgresql/card-transactions-model/enums";
import { CashboxReportStatusTypes } from "../models/postgresql/cashbox-report-model/enums";
import { CardStatusTypes } from "../models/postgresql/cards-model/enums";

export type TopUpCancellationCandidate = {
  type: CardTransactionType;
  status: CardTransactionStatusTypes;
  payment_type: PaymentType;
  payment_card_type?: PaymentCardType | null;
  payment_service?: PaymentServiceType | null;
  amount: number;
  activation_amount: number;
  balance_before?: number;
};

export type TopUpCancellationContext = {
  hasLaterTransactions?: boolean;
  cardStatus?: CardStatusTypes | string | null;
};

export const GetTopUpCancellationBlockReason = (
  transaction: TopUpCancellationCandidate,
  cardBalance: number,
  zReportStatus?: CashboxReportStatusTypes | null,
  context: TopUpCancellationContext = {},
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

  const amount = Number(transaction.amount);
  const activationAmount = Number(transaction.activation_amount || 0);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(activationAmount) ||
    activationAmount < 0 ||
    !Number.isSafeInteger(cardBalance)
  ) {
    return "CARD_BALANCE_IS_INSUFFICIENT";
  }

  if (activationAmount > 0) {
    if (Number(transaction.balance_before || 0) !== 0) {
      return "ACTIVATION_TOPUP_BALANCE_BEFORE_IS_INVALID";
    }

    if (context.hasLaterTransactions) {
      return "ACTIVATION_CARD_HAS_LATER_TRANSACTIONS";
    }

    if (
      context.cardStatus !== undefined &&
      context.cardStatus !== CardStatusTypes.ACTIVE
    ) {
      return "ACTIVATION_CARD_STATUS_IS_NOT_ACTIVE";
    }

    if (cardBalance !== amount) {
      return "ACTIVATION_CARD_BALANCE_MISMATCH";
    }
  } else if (cardBalance < amount) {
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
  const activationAmount = Number(transaction.activation_amount || 0);
  const paidAmount = amount + activationAmount;
  const values: Record<string, number> = {
    total_amount: paidAmount,
  };

  if (transaction.payment_type === PaymentType.CASH) {
    values.cash_amount = paidAmount;
  }

  if (transaction.payment_type === PaymentType.CARD) {
    values.card_amount = paidAmount;

    if (transaction.payment_card_type === PaymentCardType.UZCARD) {
      values.uzcard_amount = paidAmount;
    }

    if (transaction.payment_card_type === PaymentCardType.HUMO) {
      values.humo_amount = paidAmount;
    }
  }

  if (transaction.payment_type === PaymentType.ONLINE) {
    values.online_amount = paidAmount;

    if (transaction.payment_service === PaymentServiceType.ONEQR) {
      values.oneqr_amount = paidAmount;
    }

    if (transaction.payment_service === PaymentServiceType.UZUM) {
      values.uzum_amount = paidAmount;
    }

    if (transaction.payment_service === PaymentServiceType.PAYME) {
      values.payme_amount = paidAmount;
    }

    if (transaction.payment_service === PaymentServiceType.CLICK) {
      values.click_amount = paidAmount;
    }
  }

  if (activationAmount > 0) {
    values.activated_cards_count = 1;
    values.activated_cards_amount = activationAmount;
  }

  return values;
};
