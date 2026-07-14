import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { GetMeService } from "../../../services/client/user-services/UserServices";

export const GetMeController = makeReplyingController(
  "user",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetMeService(telegramUser.id);
  },
);
