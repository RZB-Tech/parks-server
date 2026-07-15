import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../../types/routes";
import {
  ClientAttractionPaymentService,
  GetClientTransactionsService,
} from "../../../services/client/card-transactions-services/CardTransactionServices";

export const ClientAttractionPaymentController = makeReplyingController(
  ["paid", "message", "transaction"],
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<
        ClientAttractionPaymentParams,
        ReqData<ClientAttractionPaymentData>
      >
    >,
  ) => {
    const telegramUser = request.telegram_user;
    const params = request.params;
    const body = request.body.data;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    const result = await ClientAttractionPaymentService(
      Number(telegramUser.id),
      params,
      body,
    );

    return [result.paid, result.message, result.transaction];
  },
);

export const GetClientTransactionsController = makeReplyingController(
  ["cards", "period", "summary", "transactions", "pagination"],
  async (
    request: FastifyRequest<RouteWithQuery<GetClientTransactionsQuery>>,
  ) => {
    const telegramUser = request.telegram_user;
    const query = request.query;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    const result = await GetClientTransactionsService(
      Number(telegramUser.id),
      query,
    );

    return [
      result.cards,
      result.period,
      result.summary,
      result.transactions,
      result.pagination,
    ];
  },
);
