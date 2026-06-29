import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "./enums";

export class CardTransactionModel
  extends Model<CardTransactionModelI, TableOptionalAttributes>
  implements CardTransactionModelI
{
  public id!: number;

  public card!: number;
  public operator!: number;
  public cashbox!: number;
  public attraction!: number;
  public xreport!: number;

  public type!: CardTransactionType;

  public amount!: number;
  public balance_before!: number;
  public balance_after!: number;

  public payment_type!: PaymentType;
  public payment_card_type!: PaymentCardType | null;
  public payment_service!: PaymentServiceType | null;

  public status!: CardTransactionStatusTypes;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    CardTransactionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        card: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        operator: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        cashbox: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        attraction: {
           type: DataTypes.BIGINT,
          allowNull: true,
        },

        xreport: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        type: {
          type: DataTypes.ENUM(...Object.values(CardTransactionType)),
          allowNull: false,
        },

        amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        balance_before: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        balance_after: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        payment_type: {
          type: DataTypes.ENUM(...Object.values(PaymentType)),
          allowNull: false,
        },

        payment_card_type: {
          type: DataTypes.ENUM(...Object.values(PaymentCardType)),
          allowNull: true,
        },

        payment_service: {
          type: DataTypes.ENUM(...Object.values(PaymentServiceType)),
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(CardTransactionStatusTypes)),
          allowNull: false,
          defaultValue: CardTransactionStatusTypes.SUCCESS,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "card_transactions",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CardTransactionModel.belongsTo(models.CardModel, {
      foreignKey: "card",
      as: "cards",
    });

    CardTransactionModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });

    CardTransactionModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
    });

    CardTransactionModel.belongsTo(models.CashboxReportModel, {
      foreignKey: "xreport",
      as: "xreports",
    });
  }
}
