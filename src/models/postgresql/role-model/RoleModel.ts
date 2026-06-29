import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { EmployeeModel, ModelsType } from "../../../plugins/db/postgresql/db";

export class RoleModel
  extends Model<RoleModelI, TableOptionalAttributes>
  implements RoleModelI
{
  public id!: number;
  public name!: import("./enums").RoleTypes;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {
    roles: Association<EmployeeModel, RoleModel>;
  };

  public static initialize(sequelize: Sequelize) {
    RoleModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.ENUM(
            "superadmin",
            "cashier",
            "head_cashier",
            "operator",
            "head_operator",
            "head_accountant",
          ),
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "roles",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    RoleModel.hasMany(models.EmployeeModel, {
      foreignKey: "role",
      as: "employees",
    });
  }
}
