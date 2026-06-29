import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetCategoriesController } from "../../controllers/category-controllers/CategoryController";
import { getCategoriesSchema } from "./schema";

const CategoriesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/categories",
    { schema: getCategoriesSchema, preHandler: [] },
    GetCategoriesController,
  );
};

export default CategoriesRouter;
