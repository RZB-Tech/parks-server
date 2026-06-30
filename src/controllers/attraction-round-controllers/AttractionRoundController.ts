import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { RouteWithParams } from "../../types/routes";
import { CloseCurrentAttractionRoundService, GetCurrentAttractionRoundService, GetTodayAttractionRoundsService } from "../../services/attraction-rounds-services/AttractionRoundsServices";

export const GetCurrentAttractionRoundController = makeReplyingController(
  "attraction-round",
  async (request: FastifyRequest<RouteWithParams<AttractionRoundParams>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;

    return GetCurrentAttractionRoundService(Number(operatorID), params);
  },
);

export const GetTodayAttractionRoundsController = makeReplyingController(
  "attraction-rounds",
  async (request: FastifyRequest<RouteWithParams<AttractionRoundParams>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;

    return GetTodayAttractionRoundsService(Number(operatorID), params);
  },
);

export const CloseCurrentAttractionRoundController = makeReplyingController(
  "attraction-round",
  async (request: FastifyRequest<RouteWithParams<AttractionRoundParams>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;

    return CloseCurrentAttractionRoundService(Number(operatorID), params);
  },
);
