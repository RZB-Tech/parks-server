import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { RouteWithQuery } from "../../types/routes";
import { GetAttractionStatisticsService } from "../../services/attraction-statistics-services/AttractionStatisticsServices";

export const GetAttractionStatisticsController = makeReplyingController(
  "attraction_statistics",
  async (
    request: FastifyRequest<RouteWithQuery<GetAttractionStatisticsQuery>>,
  ) => GetAttractionStatisticsService(request.query),
);
