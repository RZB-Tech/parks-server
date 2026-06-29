import { Options, Sequelize } from "sequelize";
import { EmployeeModel } from "../../../models/postgresql/employees-model/EmployeeModel";
import { RoleModel } from "../../../models/postgresql/role-model/RoleModel";
import { AttractionModel } from "../../../models/postgresql/attraction-model/AttractionModel";
import { AttractionOperatorModel } from "../../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { CategoryModel } from "../../../models/postgresql/category-model/CategoryModel";
import { FileModel } from "../../../models/postgresql/file-model/FileModel";
import { CashboxModel } from "../../../models/postgresql/cashbox-model/CashboxModel";
import { CashboxOperatorModel } from "../../../models/postgresql/cashbox-operator-model/CashboxOperatorModel";
import { CardModel } from "../../../models/postgresql/cards-model/CardModel";
import { CardBatchModel } from "../../../models/postgresql/card-batches-model/CardBatchModel";
import { CashboxReportModel } from "../../../models/postgresql/cashbox-report-model/CashboxReportModel";
import { CardTransactionModel } from "../../../models/postgresql/card-transactions-model/CardTransactionModel";

const sequelizeConfig: Options = {
  dialect: "postgres",
  host: process.env.POSTGRESQL_HOST,
  database: process.env.POSTGRESQL_DB,
  username: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  port: +process.env.POSTGRESQL_PORT!,
  logging: false,
};

export const sequelize = new Sequelize(sequelizeConfig);

const models = {
  FileModel,
  RoleModel,
  EmployeeModel,
  AttractionModel,
  AttractionOperatorModel,
  CategoryModel,
  CashboxModel,
  CashboxOperatorModel,
  CardBatchModel,
  CardModel,
  CashboxReportModel,
  CardTransactionModel,
};

export type ModelsType = typeof models;

Object.values(models).forEach((m: ModelStatic) => {
  if (typeof m.initialize === "function") {
    m.initialize!(sequelize);
  }
});

Object.values(models).forEach((m: ModelStatic) => {
  if (typeof m.associate === "function") {
    m.associate!(models);
  }
});

export {
  FileModel,
  RoleModel,
  EmployeeModel,
  AttractionModel,
  AttractionOperatorModel,
  CategoryModel,
  CashboxModel,
  CashboxOperatorModel,
  CardBatchModel,
  CardModel,
  CashboxReportModel,
  CardTransactionModel,
};
