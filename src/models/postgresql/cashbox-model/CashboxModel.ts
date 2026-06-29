import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CashboxModel
  extends Model<CashboxModelI, TableOptionalAttributes>
  implements CashboxModelI
{
  public id!: number;
  public name!: string;
  public place!: string;
  public description!: string;
  public status!: import("./enums").CashboxStatusTypes;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};
  public static initialize(sequelize: Sequelize) {
    CashboxModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        place: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "maintenance", "closed"),
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "cashboxes",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CashboxModel.hasMany(models.CashboxOperatorModel, {
      foreignKey: "cashbox",
      as: "cashbox_operator",
      onDelete: "CASCADE",
    });
    CashboxModel.hasMany(models.CashboxReportModel, {
      foreignKey: "cashbox",
      as: "reports",
      onDelete: "CASCADE",
    });
    CashboxModel.hasMany(models.CardTransactionModel, {
      foreignKey: "cashbox",
      as: "card_transactions",
      onDelete: "CASCADE",
    });
  }
}
