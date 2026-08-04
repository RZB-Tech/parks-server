import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";
import {
  CloseCurrentAttractionRoundService,
  GetAttractionRoundRefundsService,
  GetCurrentAttractionRoundService,
  GetTodayAttractionRoundsService,
  GetTodayRoundsService,
  RefundFinishedAttractionRoundService,
} from "../../services/attraction-rounds-services/AttractionRoundsServices";

export const GetAttractionRoundRefundsController = makeReplyingController(
  ["attraction-round-refunds", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetAttractionRoundRefundsQuery>>) => {
    const operatorID = request.employee?.id;
    const query = request.query;

    const result = await GetAttractionRoundRefundsService(Number(operatorID), query);

    return [
      result.refunds,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

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

export const GetTodayRoundsController = makeReplyingController(
  "attraction-rounds",
  async (request: FastifyRequest) => {
    return GetTodayRoundsService();
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

export const RefundFinishedAttractionRoundController = makeReplyingController(
  "attraction-round-refund",
  async (
    request: FastifyRequest<RouteWithParamsAndData<AttractionRoundParams,ReqData<RefundAttractionRoundData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const body = request.body.data;

    return RefundFinishedAttractionRoundService( Number(operatorID), params, body);
  },
);
