import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import {
  CreateClientClickOrderService,
  CreateClientPaymeOrderService,
  CreateClientUzumOrderService,
} from "../../../services/client/payment-services/PaymentServices";
import { RouteWithData, ReqData } from "../../../types/routes";
import { makeReplyingController } from "../../../utils/controllerHelpers";

export const CreateClientPaymeOrderController = makeReplyingController(
  "payment",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateClientPaymeOrderData>>>,
  ) => {
    const telegramUser = request.telegram_user;
    const body = request.body.data;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return CreateClientPaymeOrderService(Number(telegramUser.id), body);
  },
);

export const CreateClientClickOrderController = makeReplyingController(
  "payment",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateClientClickOrderData>>>,
  ) => {
    const telegramUser = request.telegram_user;
    const body = request.body.data;

    if (!telegramUser) throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    return CreateClientClickOrderService(Number(telegramUser.id), body);
  },
);

export const CreateClientUzumOrderController = makeReplyingController(
  "payment",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateClientUzumOrderData>>>,
  ) => {
    const telegramUser = request.telegram_user;
    const body = request.body.data;

    if (!telegramUser) throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    return CreateClientUzumOrderService(Number(telegramUser.id), body);
  },
);
