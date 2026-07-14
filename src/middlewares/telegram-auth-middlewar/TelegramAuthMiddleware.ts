import { FastifyReply, FastifyRequest } from "fastify";
import { Unauthorized } from "../../exceptions";
import { ValidateTelegramInitData } from "../../utils/client/ValidateInitData";

declare module "fastify" {
  interface FastifyRequest {
    telegram_user?: TelegramMiniAppUserI;
  }
}

export const TelegramAuthMiddleware = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  const initData = request.headers["x-telegram-init-data"];

  if (typeof initData !== "string") {
    throw Unauthorized("TELEGRAM_INIT_DATA_REQUIRED");
  }

  const validatedData = ValidateTelegramInitData(initData);

  request.telegram_user = validatedData.user;
};
