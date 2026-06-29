import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { CreateCardsController, DeleteCardsController, GetCardsController, GetCardStatsController, UpdateCardsController } from "../../controllers/cards-controllers/CardController";
import { deleteCardsSchema, getCardsSchema, getCardStatsSchema, updateCardSchema } from "./schema";

const CardsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  //   fastify.get(
  //     "/cashbox/:cashboxID",
  //     { schema: getCashboxSchema, preHandler: [] },
  //     GetCashboxController,
  //   );

  fastify.get(
    "/cards/stats",
    { schema: getCardStatsSchema, preHandler: [] },
    GetCardStatsController,
  );

  fastify.get(
    "/cards",
    { schema: getCardsSchema, preHandler: [] },
    GetCardsController,
  );

  fastify.post(
    "/cards/upload",
    { schema: { hide: true } as any, preHandler: [] },
    CreateCardsController,
  );

  fastify.put(
    "/cards/:cardID",
    { schema: updateCardSchema, preHandler: [] },
    UpdateCardsController,
  );

  fastify.delete(
    "/cards",
    { schema: deleteCardsSchema, preHandler: [] },
    DeleteCardsController,
  );
};

export default CardsRouter;
