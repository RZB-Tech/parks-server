import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { Unauthorized } from "../../../exceptions";
import {
  BindCardToUserService,
  CreateVirtualCardService,
  GetUserCardsService,
} from "../../../services/client/card-services/CardServices";
import { ReqData, RouteWithData } from "../../../types/routes";

export const GetUserCardsController = makeReplyingController(
  ["cards", "totalBalance"],
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    const result = await GetUserCardsService(Number(telegramUser.id));

    return [result.cards, result.totalBalance];
  },
);

export const CreateVirtualCardController = makeReplyingController(
  "card",
  async (request: FastifyRequest) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return await CreateVirtualCardService(Number(telegramUser.id));
  },
);

export const BindCardController = makeReplyingController(
  "card",
  async (
    request: FastifyRequest<RouteWithData<ReqData<BindCardData>>>,
  ) => {
    const telegramUser = request.telegram_user;

    if (!telegramUser) {
      throw Unauthorized("TELEGRAM_USER_NOT_FOUND");
    }

    return BindCardToUserService(
      Number(telegramUser.id),
      request.body.data,
    );
  },
);
