import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import {
  GetMeService,
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

    return await GetMeService(telegramUser.id);
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
