import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { GetCategoriesService } from "../../services/category-services/CategoriesServices";

export const GetCategoriesController = makeReplyingController(
  "categories",
  async (request: FastifyRequest) => {
    return GetCategoriesService();
  },
);
