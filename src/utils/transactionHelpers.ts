import { BadRequest } from "../exceptions";
import {
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "../models/postgresql/card-transactions-model/enums";

export const validateTopUpPaymentType = (body: CardTopUpTransactionData) => {
  if (body.payment_type === PaymentType.CARD && !body.payment_card_type) {
    throw BadRequest("Payment card type is required!");
  }

  if (body.payment_type !== PaymentType.CARD && body.payment_card_type) {
    throw BadRequest("Payment card type is allowed only for card payment!");
  }

  if (body.payment_type === PaymentType.ONLINE && !body.payment_service_type) {
    throw BadRequest("Payment service type is required!");
  }

  if (body.payment_type !== PaymentType.ONLINE && body.payment_service_type) {
    throw BadRequest(
      "Payment service type is allowed only for online payment!",
    );
  }
};
export const getReportTopUpIncrementData = (
  body: CardTopUpTransactionData,
  creditedAmount: number,
  isCardActivated: boolean,
  activationAmount: number,
): Record<string, number> => {
  const paidAmount =
    creditedAmount + (isCardActivated ? activationAmount : 0);

  const incrementData: Record<string, number> = {
    total_amount: paidAmount,
    transactions_count: 1,
  };

  if (body.payment_type === PaymentType.CASH) {
    incrementData.cash_amount = paidAmount;
  }

  if (body.payment_type === PaymentType.CARD) {
    incrementData.card_amount = paidAmount;

    if (body.payment_card_type === PaymentCardType.UZCARD) {
      incrementData.uzcard_amount = paidAmount;
    }

    if (body.payment_card_type === PaymentCardType.HUMO) {
      incrementData.humo_amount = paidAmount;
    }
  }

  if (body.payment_type === PaymentType.ONLINE) {
    incrementData.online_amount = paidAmount;

    if (body.payment_service_type === PaymentServiceType.UZUM) {
      incrementData.uzum_amount = paidAmount;
    }

    if (body.payment_service_type === PaymentServiceType.PAYME) {
      incrementData.payme_amount = paidAmount;
    }

    if (body.payment_service_type === PaymentServiceType.CLICK) {
      incrementData.click_amount = paidAmount;
    }
  }

  if (isCardActivated) {
    incrementData.activated_cards_count = 1;
    incrementData.activated_cards_amount = activationAmount;
  }

  return incrementData;
};
