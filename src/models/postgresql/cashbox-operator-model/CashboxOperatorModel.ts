import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CashboxOperatorModel
  extends Model<CashboxOperatorModelI, TableOptionalAttributes>
  implements CashboxOperatorModelI
{
  public id!: number;
  public cashbox!: number;
  public operator!: number;
  public endAt!: string;
  public status!: import("./enums").CashboxOperatorStatusTypes;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};
  public static initialize(sequelize: Sequelize) {
    CashboxOperatorModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        cashbox: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        operator: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        endAt: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "cashbox_operators",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CashboxOperatorModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
    });

    CashboxOperatorModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });
    CashboxOperatorModel.hasMany(models.SosModel, {
      foreignKey: "cashbox_operator",
      as: "sosReports",
    });
  }
}
