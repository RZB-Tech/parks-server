import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CardTransactionReversalModel
  extends Model<
    CardTransactionReversalModelI,
    TableOptionalAttributes
  >
  implements CardTransactionReversalModelI
{
  public id!: number;
  public original_transaction!: number;
  public refund_transaction!: number;
  public card!: number;
  public cashbox!: number;
  public cancelled_by!: number;
  public amount!: number;
  public reason!: string;
  public cancelled_at!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    CardTransactionReversalModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        original_transaction: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },
        refund_transaction: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },
        card: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        cashbox: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        cancelled_by: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        reason: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "card_transaction_reversals",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["card"] },
          { fields: ["cashbox"] },
          { fields: ["cancelled_by"] },
          { fields: ["cancelled_at"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    CardTransactionReversalModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "original_transaction",
      as: "original_transactions",
    });
    CardTransactionReversalModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "refund_transaction",
      as: "refund_transactions",
    });
    CardTransactionReversalModel.belongsTo(models.CardModel, {
      foreignKey: "card",
      as: "cards",
    });
    CardTransactionReversalModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
    });
    CardTransactionReversalModel.belongsTo(models.EmployeeModel, {
      foreignKey: "cancelled_by",
      as: "cancelled_by_employee",
    });
  }
}
