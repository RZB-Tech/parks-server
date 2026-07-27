import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { GetClientPromotionsService } from "../../../services/client/promotion-services/PromotionServices";

export const GetClientPromotionsController = makeReplyingController(
  "promotions",
  async (request: FastifyRequest) => {
    return GetClientPromotionsService();
  },
);
