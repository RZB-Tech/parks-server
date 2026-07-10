// modules
import fastify, { FastifyInstance } from "fastify";
import "dotenv/config";

//routes

//plugins
import { corsConfigs } from "./plugins/cors";
import { swaggerConfig } from "./plugins/swagger";
import { swaggerUIConfig } from "./plugins/swagger/ui";
import { fastifyConfig } from "./configs";

// db's
import { postgreSQLPlugin } from "./plugins/db/postgresql";

// middlewares
import { SERVER } from "./consts/server";
import EmployeesRouter from "./routes/employees-routes/EmployeesRoutes";
import AuthRouter from "./routes/auth-routes/AuthRoutes";
import RolesRouter from "./routes/roles-routes/RolesRoutes";
import FilesRouter from "./routes/files-routes/FilesRoutes";
import { multipartConfigs } from "./plugins/multipart";
import AttractionsRouter from "./routes/attractions-routes/AttractionsRoutes";
import AttractionOperatorsRouter from "./routes/attraction-operators-routes/AttractionOperatorsRoutes";
import CashboxesRouter from "./routes/cashbox-routes/CashboxRoutes";
import CashboxOperatorsRouter from "./routes/cashbox-operators-routes/CashboxOperatorsRoutes";
import CardsRouter from "./routes/card-routes/CardsRoutes";
import CardTransactionsRouter from "./routes/card-transactions-routes/CardTransactionsRoutes";
import CashboxReportsRouter from "./routes/cashbox-reports-routes/CashboxReportsRoutes";
import AttractionReportsRouter from "./routes/attraction-reports-routes/AttractionReportsRoutes";
import AttractionRoundsRouter from "./routes/attraction-rounds-routes/AttractionRoundsRoutes";

export const build = async () => {
  const app = fastify(fastifyConfig);
  await checkServerEnv(app as any);

  // connecting plugins
  app.register(require("@fastify/cors"), corsConfigs);
  app.register(require("@fastify/swagger"), swaggerConfig);
  app.register(require("@fastify/swagger-ui"), swaggerUIConfig);
  app.register(require("@fastify/multipart"), multipartConfigs);
  app.register(require("@fastify/jwt"), { secret: process.env.JWT_SECRET });
  app.register(require("@fastify/cookie"), {
    secret: process.env.COOKIE_SECRET,
  });

  // app.addContentTypeParser(
  //   "application/x-www-form-urlencoded",
  //   { parseAs: "string" },
  //   (req, body, done) => {
  //     done(null, Object.fromEntries(new URLSearchParams(body as string)));
  //   },
  // );

  // connecting to db's
  app.register(postgreSQLPlugin);

  // registration of routers
  app.register(AuthRouter, { prefix: SERVER.API_PREFIX });
  app.register(FilesRouter, { prefix: SERVER.API_PREFIX });
  app.register(EmployeesRouter, { prefix: SERVER.API_PREFIX });
  app.register(RolesRouter, { prefix: SERVER.API_PREFIX });
  app.register(AttractionsRouter, { prefix: SERVER.API_PREFIX });
  app.register(AttractionOperatorsRouter, { prefix: SERVER.API_PREFIX });
  app.register(AttractionReportsRouter, { prefix: SERVER.API_PREFIX });
  app.register(AttractionRoundsRouter, { prefix: SERVER.API_PREFIX });
  app.register(CashboxesRouter, { prefix: SERVER.API_PREFIX });
  app.register(CashboxOperatorsRouter, { prefix: SERVER.API_PREFIX });
  app.register(CashboxReportsRouter, { prefix: SERVER.API_PREFIX });
  app.register(CardsRouter, { prefix: SERVER.API_PREFIX });
  app.register(CardTransactionsRouter, { prefix: SERVER.API_PREFIX });

  app.after();
  return app;
};

async function checkServerEnv(app: FastifyInstance) {
  if (!process.env.SERVER_PORT) {
    app.log.fatal(
      "The environment variable responsible for the server port is not set",
    );
    process.exit(1);
  }

  if (
    !process.env.POSTGRESQL_USER ||
    !process.env.POSTGRESQL_HOST ||
    !process.env.POSTGRESQL_DB ||
    !process.env.POSTGRESQL_PASSWORD ||
    !process.env.POSTGRESQL_PORT
  ) {
    app.log.fatal(
      "The environment variable responsible for connecting to the PostgreSQL database is not set",
    );
    process.exit(1);
  }

  // if (!process.env.BOT_TOKEN) {
  //   app.log.fatal(
  //     "The environment variable responsible for bot token is not set",
  //   );
  //   process.exit(1);
  // }
}
