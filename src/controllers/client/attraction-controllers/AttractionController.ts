import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import {
  GetAttractionRoundService,
  GetClientAttractionsService,
} from "../../../services/client/attraction-services/AttractionServices";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { RouteWithParams } from "../../../types/routes";

export const GetClientAttractionsController = makeReplyingController(
  "attractions",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetClientAttractionsService(Number(telegramUser.id));
  },
);

export const GetAttractionRoundController = makeReplyingController(
  "attraction",
  async (
    request: FastifyRequest<RouteWithParams<GetAttractionRoundParams>>,
  ) => {
    const telegramUser = request.telegram_user;
    const params = request.params;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetAttractionRoundService(Number(telegramUser.id), params);
  },
);
