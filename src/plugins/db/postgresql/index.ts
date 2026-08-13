import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { sequelize } from "./db";
import { EnsureCardBindingSchema } from "./cardBindingSchema";

const ConnectDB: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  try {
    await sequelize.authenticate();

    await sequelize.sync();
    await EnsureCardBindingSchema(sequelize);

    fastify.decorate("sequelize", sequelize);

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
