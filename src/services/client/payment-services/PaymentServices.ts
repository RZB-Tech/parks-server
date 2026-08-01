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
  UzumTransactionModel,
} from "../../../plugins/db/postgresql/db";
import { RegisterUzumPaymentService } from "../../payment-services/uzum/UzumServices";
import { UzumTransactionStateTypes } from "../../../models/postgresql/uzum-transactions-model/enums";

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

const buildClickCheckoutURL = (orderID: number, amount: number) => {
  const serviceID = process.env.CLICK_SERVICE_ID;
  const merchantID = process.env.CLICK_MERCHANT_ID;
  const returnURL = process.env.CLICK_RETURN_URL;
  const checkoutURL =
    process.env.CLICK_CHECKOUT_URL || "https://my.click.uz/services/pay";

  if (!serviceID || !merchantID || !returnURL) {
    throw InternalServerError("CLICK_CHECKOUT_NOT_CONFIGURED");
  }

  let parsedCheckoutURL: URL;
  let parsedReturnURL: URL;
  try {
    parsedCheckoutURL = new URL(checkoutURL);
    parsedReturnURL = new URL(returnURL);
  } catch {
    throw InternalServerError("CLICK_CHECKOUT_URL_INVALID");
  }

  if (
    !["http:", "https:"].includes(parsedCheckoutURL.protocol) ||
    !["http:", "https:"].includes(parsedReturnURL.protocol)
  ) {
    throw InternalServerError("CLICK_CHECKOUT_URL_INVALID");
  }

  parsedCheckoutURL.searchParams.set("service_id", serviceID);
  parsedCheckoutURL.searchParams.set("merchant_id", merchantID);
  parsedCheckoutURL.searchParams.set("amount", String(amount));
  parsedCheckoutURL.searchParams.set("transaction_param", String(orderID));
  parsedCheckoutURL.searchParams.set("return_url", returnURL);

  return parsedCheckoutURL.toString();
};

export const CreateClientClickOrderService = async (
  telegramID: number,
  body: CreateClientClickOrderData,
): Promise<CreateClientClickOrderResponse> => {
  if (process.env.CLICK_ENABLED === "false") {
    throw BadRequest("CLICK_PAYMENT_DISABLED");
  }

  const cardID = Number(body.card);
  const amount = Number(body.amount);

  if (!Number.isSafeInteger(cardID) || cardID <= 0) {
    throw BadRequest("INVALID_CARD_ID");
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw BadRequest("INVALID_TOPUP_AMOUNT");
  }

  return sequelize.transaction(async (dbTransaction) => {
    const user = await UserModel.findOne({
      where: { telegram_id: telegramID },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!user) throw BadRequest("USER_NOT_REGISTERED");
    if (
      user.status !== UserStatusTypes.ACTIVE ||
      !user.phone_verified_at ||
      !user.registered_at
    ) {
      throw BadRequest("USER_NOT_VERIFIED");
    }

    const card = await CardModel.findOne({
      where: { id: cardID, user: user.id },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!card) throw NotFound("CARD_NOT_FOUND");
    if (card.status !== CardStatusTypes.ACTIVE) {
      throw BadRequest("CARD_MUST_BE_ACTIVE");
    }

    const processingOrder = await PaymentOrderModel.findOne({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.CLICK,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PROCESSING,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (processingOrder) throw BadRequest("PAYMENT_ALREADY_PROCESSING");

    const pendingOrders = await PaymentOrderModel.findAll({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.CLICK,
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
      const obsoleteIDs = pendingOrders
        .filter((order) => order.id !== reusableOrder.id)
        .map((order) => order.id);
      if (obsoleteIDs.length) {
        await PaymentOrderModel.update(
          { status: PaymentOrderStatusTypes.EXPIRED },
          { where: { id: obsoleteIDs }, transaction: dbTransaction },
        );
      }
      return {
        order_id: String(reusableOrder.id),
        amount: Number(reusableOrder.amount),
        status: reusableOrder.status,
        checkout_url: buildClickCheckoutURL(
          reusableOrder.id,
          Number(reusableOrder.amount),
        ),
      };
    }

    if (pendingOrders.length) {
      await PaymentOrderModel.update(
        { status: PaymentOrderStatusTypes.EXPIRED },
        {
          where: { id: pendingOrders.map((order) => order.id) },
          transaction: dbTransaction,
        },
      );
    }

    const expiresInMinutes = getPositiveInteger(
      process.env.CLICK_ORDER_EXPIRES_MINUTES,
      30,
    );
    const order = await PaymentOrderModel.create(
      {
        user: Number(user.id),
        card: Number(card.id),
        provider: PaymentProviderTypes.CLICK,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PENDING,
        amount,
        expires_at: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
        performed_at: null,
        cancelled_at: null,
      },
      { transaction: dbTransaction },
    );

    return {
      order_id: String(order.id),
      amount: Number(order.amount),
      status: order.status,
      checkout_url: buildClickCheckoutURL(order.id, Number(order.amount)),
    };
  });
};

export const CreateClientUzumOrderService = async (
  telegramID: number,
  body: CreateClientUzumOrderData,
): Promise<CreateClientUzumOrderResponse> => {
  if (process.env.UZUM_ENABLED !== "true") {
    throw BadRequest("UZUM_PAYMENT_DISABLED");
  }

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

  const prepared = await sequelize.transaction(async (dbTransaction) => {
    const user = await UserModel.findOne({
      where: { telegram_id: telegramID },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!user) throw BadRequest("USER_NOT_REGISTERED");
    if (
      user.status !== UserStatusTypes.ACTIVE ||
      !user.phone_verified_at ||
      !user.registered_at
    ) {
      throw BadRequest("USER_NOT_VERIFIED");
    }

    const card = await CardModel.findOne({
      where: { id: cardID, user: user.id },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!card) throw NotFound("CARD_NOT_FOUND");
    if (card.status !== CardStatusTypes.ACTIVE) {
      throw BadRequest("CARD_MUST_BE_ACTIVE");
    }

    const processingOrder = await PaymentOrderModel.findOne({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.UZUM,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PROCESSING,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (processingOrder) {
      const existingTransaction = await UzumTransactionModel.findOne({
        where: { payment_order: processingOrder.id },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });
      if (
        existingTransaction &&
        Number(processingOrder.amount) === amount
      ) {
        return {
          existing: true as const,
          order: processingOrder,
          checkout_url: existingTransaction.redirect_url,
        };
      }
      throw BadRequest("PAYMENT_ALREADY_PROCESSING");
    }

    const pendingOrders = await PaymentOrderModel.findAll({
      where: {
        user: user.id,
        card: card.id,
        provider: PaymentProviderTypes.UZUM,
        purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
        status: PaymentOrderStatusTypes.PENDING,
      },
      order: [["id", "DESC"]],
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    const now = new Date();
    let order = pendingOrders.find(
      (item) =>
        Number(item.amount) === amount &&
        (!item.expires_at || item.expires_at.getTime() > now.getTime()),
    );
    const obsoleteIDs = pendingOrders
      .filter((item) => !order || item.id !== order.id)
      .map((item) => item.id);
    if (obsoleteIDs.length) {
      await PaymentOrderModel.update(
        { status: PaymentOrderStatusTypes.EXPIRED },
        { where: { id: obsoleteIDs }, transaction: dbTransaction },
      );
    }

    if (!order) {
      const expiresInMinutes = getPositiveInteger(
        process.env.UZUM_ORDER_EXPIRES_MINUTES,
        15,
      );
      order = await PaymentOrderModel.create(
        {
          user: Number(user.id),
          card: Number(card.id),
          provider: PaymentProviderTypes.UZUM,
          purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
          status: PaymentOrderStatusTypes.PROCESSING,
          amount,
          expires_at: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
          performed_at: null,
          cancelled_at: null,
        },
        { transaction: dbTransaction },
      );
    } else {
      await order.update(
        { status: PaymentOrderStatusTypes.PROCESSING },
        { transaction: dbTransaction },
      );
    }

    return {
      existing: false as const,
      order,
      client_id: String(user.id),
      card_number: card.card,
    };
  });

  if (prepared.existing) {
    return {
      order_id: String(prepared.order.id),
      amount: Number(prepared.order.amount),
      status: prepared.order.status,
      checkout_url: prepared.checkout_url,
    };
  }

  try {
    const registered = await RegisterUzumPaymentService(
      prepared.order,
      prepared.client_id,
      prepared.card_number,
    );

    return await sequelize.transaction(async (dbTransaction) => {
      const order = await PaymentOrderModel.findByPk(prepared.order.id, {
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });
      if (!order || order.status !== PaymentOrderStatusTypes.PROCESSING) {
        throw BadRequest("UZUM_ORDER_CANNOT_BE_REGISTERED");
      }

      const transaction = await UzumTransactionModel.create(
        {
          payment_order: Number(order.id),
          card_transaction: null,
          uzum_order_id: registered.uzum_order_id,
          merchant_operation_id: null,
          order_number: String(order.id),
          amount: Number(order.amount),
          redirect_url: registered.checkout_url,
          state: UzumTransactionStateTypes.REGISTERED,
          operation_type: null,
          rrn: null,
          card_type: null,
          binding_id: null,
          raw_callback: null,
          registered_at: new Date(),
          completed_at: null,
          declined_at: null,
          refunded_at: null,
        },
        { transaction: dbTransaction },
      );

      return {
        order_id: String(order.id),
        amount: Number(order.amount),
        status: order.status,
        checkout_url: transaction.redirect_url,
      };
    });
  } catch (error) {
    await PaymentOrderModel.update(
      { status: PaymentOrderStatusTypes.PENDING },
      {
        where: {
          id: prepared.order.id,
          status: PaymentOrderStatusTypes.PROCESSING,
        },
      },
    );
    throw error;
  }
};
