import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndQuery,
} from "../../types/routes";
import { Unauthorized } from "../../exceptions";
import { CheckNfcCardService, CardTopUpTransactionService, GetCardTransactionsService, CardPaymentTransactionService, CardRefundTransactionService } from "../../services/card-transactions-services/CardTransactionsServices";

export const CheckNfcCardController = makeReplyingController(
  "card",
  async (request: FastifyRequest<RouteWithData<ReqData<CheckNFCCardData>>>) => {
    const operatorID = request.employee?.id;
    const body = request.body.data;

    return CheckNfcCardService(Number(operatorID), body);
  },
);

export const CardTopUpTransactionController = makeReplyingController(
  "transaction",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CardTopUpTransactionData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const body = request.body.data;

    return CardTopUpTransactionService(Number(operatorID), body);
  },
);

export const CardRefundTransactionController = makeReplyingController(
  "transaction",
  async (request: FastifyRequest) => {
    const operatorID = request.employee?.id;
    const body = request.body as ReqData<CardRefundData> | undefined;

    return CardRefundTransactionService(
      Number(operatorID),
      body?.data ?? { card: "" },
    );
  },
);


export const GetCashboxCardTransactionsController = makeReplyingController(
  ["cashbox-transactions", "pagination"],
  async (
    request: FastifyRequest<
      RouteWithParamsAndQuery<CashboxParams, GetCashboxCardTransactionsQuery>
    >,
  ) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const query = request.query;
    const result = await GetCardTransactionsService(Number(operatorID),params,query);

    return [
      result.transactions,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);


export const CardPaymentTransactionController = makeReplyingController(
  "payment",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CardPaymentTransactionData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const body = request.body.data;

    return CardPaymentTransactionService(Number(operatorID), body);
  },
);
