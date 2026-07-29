import { BadRequest, InternalServerError, NotFound } from "../../../exceptions";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import { CardStatusTypes } from "../../../models/postgresql/cards-model/enums";
import { PaymentOrderModel } from "../../../models/postgresql/payment-orders-model/PaymentOrderModel";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "../../../models/postgresql/payment-orders-model/enums";
import {
  CardModel,
  sequelize,
  UserModel,
} from "../../../plugins/db/postgresql/db";

const getPositiveInteger = (
  value: string | undefined,
  fallback: number,
) => {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getPaymeCheckoutBaseURL = () => {
  const configuredURL =
    process.env.PAYME_MODE === "test"
      ? process.env.PAYME_TEST_CHECKOUT_URL
      : process.env.PAYME_CHECKOUT_URL;

  const fallbackURL =
    process.env.PAYME_MODE === "test"
      ? "https://test.paycom.uz"
      : "https://checkout.paycom.uz";

  return (configuredURL || fallbackURL).replace(/\/+$/, "");
};

const buildPaymeCheckoutURL = (orderID: number, amount: number) => {
  const merchantID = process.env.PAYME_MERCHANT_ID;
  const returnURL = process.env.PAYME_RETURN_URL;

  if (!merchantID || !returnURL) {
    throw InternalServerError("PAYME_CHECKOUT_NOT_CONFIGURED");
  }

  let parsedReturnURL: URL;

  try {
    parsedReturnURL = new URL(returnURL);
  } catch {
    throw InternalServerError("PAYME_RETURN_URL_INVALID");
  }

  if (
    !["http:", "https:"].includes(parsedReturnURL.protocol) ||
    returnURL.includes(";")
  ) {
    throw InternalServerError("PAYME_RETURN_URL_INVALID");
  }

  const params = [
    `m=${merchantID}`,
    `ac.order_id=${orderID}`,
    `a=${amount * 100}`,
    "l=uz",
    `c=${returnURL}`,
    "ct=3000",
  ].join(";");
  const encodedParams = Buffer.from(params, "utf8").toString("base64");

  return `${getPaymeCheckoutBaseURL()}/${encodedParams}`;
};

export const CreateClientPaymeOrderService = async (
  telegramID: number,
  body: CreateClientPaymeOrderData,
): Promise<CreateClientPaymeOrderResponse> => {
  const cardID = Number(body.card);
  const amount = Number(body.amount);

  if (!Number.isSafeInteger(cardID) || cardID <= 0) {
    throw BadRequest("INVALID_CARD_ID");
  }

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > Math.floor(Number.MAX_SAFE_INTEGER / 100)
  ) {
    throw BadRequest("INVALID_TOPUP_AMOUNT");
  }

  return sequelize.transaction(async (dbTransaction) => {
    const user = await UserModel.findOne({
      where: {
        telegram_id: telegramID,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!user) {
      throw BadRequest("USER_NOT_REGISTERED");
    }

    if (
      user.status !== UserStatusTypes.ACTIVE ||
      !user.phone_verified_at ||
      !user.registered_at
    ) {
      throw BadRequest("USER_NOT_VERIFIED");
    }

    const card = await CardModel.findOne({
      where: {
        id: cardID,
        user: user.id,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("CARD_NOT_FOUND");
    }

    if (card.status !== CardStatusTypes.ACTIVE) {
      throw BadRequest("CARD_MUST_BE_ACTIVE");
    }

    const processingOrder = await PaymentOrderModel.findOne({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.PAYME,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PROCESSING,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (processingOrder) {
      throw BadRequest("PAYMENT_ALREADY_PROCESSING");
    }

    const pendingOrders = await PaymentOrderModel.findAll({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.PAYME,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PENDING,
      },
      order: [["id", "DESC"]],
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    const now = new Date();
    const reusableOrder = pendingOrders.find(
      (order) =>
        Number(order.amount) === amount &&
        (!order.expires_at || order.expires_at.getTime() > now.getTime()),
    );

    if (reusableOrder) {
      const obsoleteOrderIDs = pendingOrders
        .filter((order) => order.id !== reusableOrder.id)
        .map((order) => order.id);

      if (obsoleteOrderIDs.length > 0) {
        await PaymentOrderModel.update(
          {
            status: PaymentOrderStatusTypes.EXPIRED,
          },
          {
            where: {
              id: obsoleteOrderIDs,
            },
            transaction: dbTransaction,
          },
        );
      }

      return {
        order_id: String(reusableOrder.id),
        amount: Number(reusableOrder.amount),
        status: reusableOrder.status,
        checkout_url: buildPaymeCheckoutURL(
          reusableOrder.id,
          Number(reusableOrder.amount),
        ),
      };
    }

    if (pendingOrders.length > 0) {
      await PaymentOrderModel.update(
        {
          status: PaymentOrderStatusTypes.EXPIRED,
        },
        {
          where: {
            id: pendingOrders.map((order) => order.id),
          },
          transaction: dbTransaction,
        },
      );
    }

    const expiresInMinutes = getPositiveInteger(
      process.env.PAYME_ORDER_EXPIRES_MINUTES,
      30,
    );
    const order = await PaymentOrderModel.create(
      {
        user: Number(user.id),
        card: Number(card.id),
        provider: PaymentProviderTypes.PAYME,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PENDING,
        amount,
        expires_at: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
        performed_at: null,
        cancelled_at: null,
      },
      {
        transaction: dbTransaction,
      },
    );

    return {
      order_id: String(order.id),
      amount: Number(order.amount),
      status: order.status,
      checkout_url: buildPaymeCheckoutURL(order.id, Number(order.amount)),
    };
  });
};
