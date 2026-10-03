import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import {
  GetMeService,
  UpdateAgreementService,
  UpdateMeService,
} from "../../../services/client/user-services/UserServices";
import { ReqData } from "../../../types/routes";

export const GetMeController = makeReplyingController(
  "user",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetMeService(telegramUser.id, telegramUser.language_code);
  },
);

export const UpdateMeController = makeReplyingController(
  "user",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;
    const body = request.body as ReqData<UpdateMeData>;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return UpdateMeService(Number(telegramUser.id), body.data);
  },
);

export const UpdateAgreementController = makeReplyingController(
  "agreement",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;
    const body = request.body as ReqData<UpdateAgreementData>;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return UpdateAgreementService(Number(telegramUser.id), body.data);
  },
);
