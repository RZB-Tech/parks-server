import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { PaymeTransactionStateTypes } from "./enums";

export class PaymeTransactionModel
  extends Model<PaymeTransactionModelI, TableOptionalAttributes>
  implements PaymeTransactionModelI
{
  public id!: number;

  public payment_order!: number;
  public card_transaction!: number | null;

  public payme_id!: string;
  public payme_time!: number;
  public amount!: number;

  public account!: Record<string, unknown>;
  public receivers!: Array<Record<string, unknown>> | null;

  public state!: PaymeTransactionStateTypes;
  public reason!: number | null;

  public create_time!: number;
  public perform_time!: number;
  public cancel_time!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    PaymeTransactionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        payment_order: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },

        card_transaction: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        payme_id: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },

        payme_time: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        account: {
          type: DataTypes.JSONB,
          allowNull: false,
        },

        receivers: {
          type: DataTypes.JSONB,
          allowNull: true,
        },

        state: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: PaymeTransactionStateTypes.CREATED,
        },

        reason: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        create_time: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        perform_time: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        cancel_time: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "payme_transactions",
        timestamps: true,
        indexes: [
          {
            fields: ["payme_time"],
          },
          {
            fields: ["state"],
          },
          {
            fields: ["created_at"],
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    PaymeTransactionModel.belongsTo(models.PaymentOrderModel, {
      foreignKey: "payment_order",
      as: "payment_order_data",
    });

    PaymeTransactionModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "card_transaction",
      as: "card_transaction_data",
    });
  }
}
