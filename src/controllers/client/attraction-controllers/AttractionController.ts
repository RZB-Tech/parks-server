import { FastifyRequest } from "fastify";
import { Unauthorized } from "../../../exceptions";
import {
  GetAttractionRoundService,
  GetClientAttractionService,
  GetClientAttractionsService,
} from "../../../services/client/attraction-services/AttractionServices";
import { makeReplyingController } from "../../../utils/controllerHelpers";

export const GetClientAttractionsController = makeReplyingController(
  "attractions",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;
    const query = request.query as GetClientAttractionsQuery;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetClientAttractionsService(Number(telegramUser.id), query);
  },
);

export const GetClientAttractionController = makeReplyingController(
  "attraction",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;
    const params = request.params as GetClientAttractionParams;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return GetClientAttractionService(Number(telegramUser.id), params);
  },
);

export const GetAttractionRoundController = makeReplyingController(
  "attraction",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;
    const params = request.params as GetAttractionRoundParams;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await GetAttractionRoundService(Number(telegramUser.id), params);
  },
);
