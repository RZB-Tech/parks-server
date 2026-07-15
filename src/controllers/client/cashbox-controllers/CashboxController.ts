import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { Unauthorized } from "../../../exceptions";
import { GetClientCashboxesService } from "../../../services/client/cashbox-services/CashboxServices";

export const GetClientCashboxesController = makeReplyingController(
  "cashboxes",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetClientCashboxesService(Number(telegramUser.id));
  },
);
