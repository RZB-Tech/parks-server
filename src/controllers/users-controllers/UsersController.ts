import { FastifyRequest } from "fastify";
import { GetUsersStatisticsService } from "../../services/users-services/UsersServices";
import { RouteWithQuery } from "../../types/routes";
import { makeReplyingController } from "../../utils/controllerHelpers";

export const GetUsersStatisticsController = makeReplyingController(
  "user_statistics",
  async (
    request: FastifyRequest<RouteWithQuery<GetUsersStatisticsQuery>>,
  ) => GetUsersStatisticsService(request.query),
);

