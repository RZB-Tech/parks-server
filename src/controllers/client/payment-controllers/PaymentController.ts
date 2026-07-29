import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import { CreateClientPaymeOrderService } from "../../../services/client/payment-services/PaymentServices";
import { RouteWithData, ReqData } from "../../../types/routes";
import { makeReplyingController } from "../../../utils/controllerHelpers";

export const CreateClientPaymeOrderController = makeReplyingController(
  "payment",
  async (request: FastifyRequest<RouteWithData<ReqData<CreateClientPaymeOrderData>>>,) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return CreateClientPaymeOrderService(
      Number(telegramUser.id),
      request.body.data,
    );
  },
);
