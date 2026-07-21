import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData } from "../../types/routes";
import { CreatePromotionData } from "./types";
import { CreatePromotionService } from "../../services/promotion-services/PromotionServices";

export const CreatePromotionController = makeReplyingController(
  "promotion",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreatePromotionData>>>,
  ) => {
    const body = request.body.data;

    return CreatePromotionService(body);
  },
);
