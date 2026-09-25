import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  GetCashboxTurnoverStatisticsService,
  GetPaymentMethodsStatisticsService,
} from "../../services/cashbox-statistics-services/CashboxStatisticsServices";
import { RouteWithQuery } from "../../types/routes";

export const GetCashboxTurnoverStatisticsController = makeReplyingController(
  "cashbox_turnover",
  async (
    request: FastifyRequest<RouteWithQuery<GetCashboxStatisticsQuery>>,
  ) => GetCashboxTurnoverStatisticsService(request.query),
);

export const GetPaymentMethodsStatisticsController = makeReplyingController(
  "payment_methods",
  async (
    request: FastifyRequest<RouteWithQuery<GetCashboxStatisticsQuery>>,
  ) => GetPaymentMethodsStatisticsService(request.query),
);
