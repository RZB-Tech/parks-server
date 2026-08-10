import { FastifyRequest } from "fastify";
import { GetAttractionPnlService } from "../../services/attraction-pnl-services/AttractionPnlServices";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { RouteWithQuery } from "../../types/routes";

export const GetAttractionPnlController = makeReplyingController(
  "attraction-pnl",
  async (request: FastifyRequest<RouteWithQuery<GetAttractionPnlQuery>>) => {
    const query = request.query;

    return GetAttractionPnlService(query);
  },
);
