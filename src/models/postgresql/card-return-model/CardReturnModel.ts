import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CardReturnModel
  extends Model<CardReturnModelI, TableOptionalAttributes>
  implements CardReturnModelI
{
  public id!: number;
  public operator!: number | null;
  public cashbox!: number | null;
  public xreport!: number | null;
  public zreport!: number | null;
  public old_card!: number | null;
  public new_card!: number | null;
  public old_card_number!: string;
  public new_card_number!: string;
  public amount!: number;
  public description!: string | null;
  public returned_at!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    CardReturnModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        cashbox: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        xreport: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        zreport: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        old_card: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        new_card: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        old_card_number: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        new_card_number: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        description: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        returned_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "card_returns",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["returned_at"] },
          { fields: ["cashbox", "returned_at"] },
          { fields: ["operator", "returned_at"] },
          { fields: ["old_card"] },
          { fields: ["new_card"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    CardReturnModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
      onDelete: "SET NULL",
    });

    CardReturnModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
      onDelete: "SET NULL",
    });

    CardReturnModel.belongsTo(models.CardModel, {
      foreignKey: "old_card",
      as: "old_cards",
      onDelete: "SET NULL",
    });

    CardReturnModel.belongsTo(models.CardModel, {
      foreignKey: "new_card",
      as: "new_cards",
      onDelete: "SET NULL",
    });

    CardReturnModel.belongsTo(models.CashboxReportModel, {
      foreignKey: "xreport",
      as: "xreports",
      onDelete: "SET NULL",
    });

    CardReturnModel.belongsTo(models.CashboxReportModel, {
      foreignKey: "zreport",
      as: "zreports",
      onDelete: "SET NULL",
    });
  }
}
