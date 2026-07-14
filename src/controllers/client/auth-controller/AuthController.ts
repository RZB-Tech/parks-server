import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { ReqData, RouteWithData } from "../../../types/routes";
import { Unauthorized } from "../../../exceptions";
import {
  AuthUserService,
  VerifyAuthOtpService,
} from "../../../services/client/auth-services/AuthServices";

export const RegisterUserController = makeReplyingController(
  "registration",
  async (request: FastifyRequest<RouteWithData<ReqData<AuthUserData>>>) => {
    const telegramUser = request.telegram_user;
    const body = request.body.data;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await AuthUserService(telegramUser, body);
  },
);

export const VerifyRegistrationOtpController = makeReplyingController(
  "user",
  async (
    request: FastifyRequest<RouteWithData<ReqData<VerifyAuthOtpData>>>,
  ) => {
    const telegramUser = request.telegram_user;
    const body = request.body.data;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await VerifyAuthOtpService(telegramUser, body);
  },
);
