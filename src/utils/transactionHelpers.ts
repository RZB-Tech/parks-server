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
  amount: number,
  isCardActivated: boolean,
): Record<string, number> => {
  const incrementData: Record<string, number> = {
    total_amount: amount,
    transactions_count: 1,
  };

  if (body.payment_type === PaymentType.CASH) {
    incrementData.cash_amount = amount;
  }

  if (body.payment_type === PaymentType.CARD) {
    incrementData.card_amount = amount;

    if (body.payment_card_type === PaymentCardType.UZCARD) {
      incrementData.uzcard_amount = amount;
    }

    if (body.payment_card_type === PaymentCardType.HUMO) {
      incrementData.humo_amount = amount;
    }
  }

  if (body.payment_type === PaymentType.ONLINE) {
    incrementData.online_amount = amount;

    if (body.payment_service_type === PaymentServiceType.UZUM) {
      incrementData.uzum_amount = amount;
    }

    if (body.payment_service_type === PaymentServiceType.PAYME) {
      incrementData.payme_amount = amount;
    }

    if (body.payment_service_type === PaymentServiceType.CLICK) {
      incrementData.click_amount = amount;
    }
  }

  if (isCardActivated) {
    incrementData.activated_cards_count = 1;
  }

  return incrementData;
};