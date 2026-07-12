import { FastifyPluginAsync, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import {
  AttractionModel,
  AttractionOperatorModel,
  AttractionReportModel,
  AttractionRoundModel,
  CardBatchModel,
  CardModel,
  CardTransactionModel,
  CashboxModel,
  CashboxOperatorModel,
  CashboxReportModel,
  EmployeeModel,
  FileModel,
  RoleModel,
  sequelize,
  SosModel,
} from "./db";

const ConnectDB: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  try {
    await sequelize.authenticate();

    await FileModel.sync({ alter: true });
    await RoleModel.sync({ alter: true });
    await EmployeeModel.sync({ alter: true });
    await AttractionModel.sync({ alter: true });
    await AttractionOperatorModel.sync({ alter: true });
    await CashboxModel.sync({ alter: true });
    await CashboxOperatorModel.sync({ alter: true });
    await CardBatchModel.sync({ alter: true });
    await CardModel.sync({ alter: true });
    await CashboxReportModel.sync({ alter: true });
    await CardTransactionModel.sync({ alter: true });
    await AttractionReportModel.sync({ alter: true });
    await AttractionRoundModel.sync({ alter: true });
    await SosModel.sync({ alter: true });

    fastify.log.info({ actor: "PostgresSQL" }, "connected");

    fastify.decorate("sequelize", sequelize);
    fastify.addHook("onClose", (fastifyInstance, done) => {
      sequelize
        .close()
        .then(() => {
          done();
        })
        .catch((err) => {
          done();
        });
    });
  } catch (error) {
    fastify.log.error(
      { actor: "PostgresSQL" },
      "Failed to connect to database",
    );
    fastify.log.error(error);
    throw error;
  }
};

export const postgreSQLPlugin = fp(ConnectDB);
