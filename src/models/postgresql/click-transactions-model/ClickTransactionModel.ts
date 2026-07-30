import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { ClickTransactionStatusTypes } from "./enums";

export class ClickTransactionModel
  extends Model<ClickTransactionModelI, TableOptionalAttributes>
  implements ClickTransactionModelI
{
  public id!: number;
  public payment_order!: number;
  public card_transaction!: number | null;
  public click_trans_id!: string;
  public click_paydoc_id!: string;
  public merchant_prepare_id!: string;
  public amount!: number;
  public status!: ClickTransactionStatusTypes;
  public error!: number | null;
  public error_note!: string | null;
  public prepared_at!: Date;
  public completed_at!: Date | null;
  public cancelled_at!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    ClickTransactionModel.init(
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
        click_trans_id: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        click_paydoc_id: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        merchant_prepare_id: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(ClickTransactionStatusTypes)),
          allowNull: false,
          defaultValue: ClickTransactionStatusTypes.PREPARED,
        },
        error: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        error_note: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        prepared_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "click_transactions",
        timestamps: true,
        indexes: [{ fields: ["status"] }, { fields: ["created_at"] }],
      },
    );
  }

  public static associate(models: ModelsType) {
    ClickTransactionModel.belongsTo(models.PaymentOrderModel, {
      foreignKey: "payment_order",
      as: "payment_order_data",
    });
    ClickTransactionModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "card_transaction",
      as: "card_transaction_data",
    });
  }
}
