import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { sequelize } from "./db";
import { EnsureCardBindingSchema } from "./cardBindingSchema";
import { EnsureOnlinePaymentsSchema } from "./onlinePaymentsSchema";
import { EnsureAttractionsSchema } from "./attractionsSchema";
import { EnsureUsersSchema } from "./usersSchema";
import { EnsureVirtualCardSequences } from "./virtualCardSequences";
import { EnsureEmployeeNfcSchema } from "./employeeNfcSchema";
import { EnsureSosAttractionSchema } from "./sosAttractionSchema";
import { EnsureUzumMerchantSchema } from "./uzumMerchantSchema";
import { EnsureAttractionRoundEventsSchema } from "./attractionRoundEventsSchema";
import { AttractionRoundEventBroker, AttractionRoundEventListener } from "../../../realtime/attractionRoundEvents";

const ConnectDB: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  try {
    await sequelize.authenticate();

    await sequelize.sync();
    await EnsureAttractionsSchema(sequelize);
    await EnsureUsersSchema(sequelize);
    await EnsureOnlinePaymentsSchema(sequelize);
    await EnsureCardBindingSchema(sequelize);
    await EnsureVirtualCardSequences(sequelize);
    await EnsureEmployeeNfcSchema(sequelize);
    await EnsureSosAttractionSchema(sequelize);
    await EnsureUzumMerchantSchema(sequelize);
    await EnsureAttractionRoundEventsSchema(sequelize);

    fastify.decorate("sequelize", sequelize);

    const broker = new AttractionRoundEventBroker();
    const listener = new AttractionRoundEventListener(broker, {
      host: sequelize.config.host,
      port: Number(sequelize.config.port),
      database: sequelize.config.database,
      user: sequelize.config.username,
      password: sequelize.config.password ?? undefined,
    }, fastify.log);
    fastify.decorate("attractionRoundEvents", broker);
    // Hijacked SSE responses must close before Fastify waits for requests to finish.
    fastify.addHook("preClose", async () => { await listener.stop(); });
    await listener.start();

    fastify.addHook("onClose", async () => {
      try {
        await sequelize.close();
      } catch (error) {
        fastify.log.error(
          { actor: "PostgreSQL", error },
          "Failed to close database connection",
        );
      }
    });

    fastify.log.info({ actor: "PostgreSQL" }, "Database connected");
  } catch (error) {
    fastify.log.error(
      { actor: "PostgreSQL", error },
      "Failed to connect to database",
    );

    throw error;
  }
};

export const postgreSQLPlugin = fp(ConnectDB);
