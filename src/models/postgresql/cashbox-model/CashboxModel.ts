import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CashboxModel
  extends Model<CashboxModelI, TableOptionalAttributes>
  implements CashboxModelI
{
  public id!: number;
  public device!: number;
  public name!: string;
  public place!: string;
  public description!: string;
  public status!: import("./enums").CashboxStatusTypes;
  public main_file!: number;
  public dashboard_file!: number;
  public latitude!: string | null;
  public longitude!: string | null;

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
        device: {
          type: DataTypes.BIGINT,
          unique: true,
          allowNull: true,
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
          type: DataTypes.ENUM(
            "active",
            "inactive",
            "stopped",
            "maintenance",
            "closed",
          ),
          allowNull: false,
        },
        main_file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        dashboard_file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        latitude: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        longitude: {
          type: DataTypes.STRING,
          allowNull: true,
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
