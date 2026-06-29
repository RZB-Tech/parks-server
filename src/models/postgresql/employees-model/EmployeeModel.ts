import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class EmployeeModel
  extends Model<EmployeeModelI, TableOptionalAttributes>
  implements EmployeeModelI
{
  public id!: number;
  public firstname!: string;
  public lastname!: string;
  public date_of_birth!: Date;
  public phone_number!: string;
  public telegram_username!: string;
  public role!: number;
  public status!: import("./enums").EmployeeStatusTypes;
  public salary!: number | null;
  public file!: number | null;
  public password!: string;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    EmployeeModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        firstname: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastname: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        date_of_birth: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        phone_number: {
          type: DataTypes.STRING(15),
          allowNull: false,
        },
        telegram_username: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "vacation", "fired"),
          defaultValue: "active",
          allowNull: false,
        },
        salary: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "employees",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    EmployeeModel.belongsTo(models.RoleModel, {
      foreignKey: "role",
      as: "roles",
    });
    EmployeeModel.hasMany(models.AttractionOperatorModel, {
      foreignKey: "operator",
      onDelete: "CASCADE",
    });
    EmployeeModel.hasMany(models.CashboxOperatorModel, {
      foreignKey: "operator",
      onDelete: "CASCADE",
    });
    EmployeeModel.hasMany(models.CashboxReportModel, {
      foreignKey: "employee",
      onDelete: "CASCADE",
    });
    EmployeeModel.hasMany(models.CardTransactionModel, {
      foreignKey: "operator",
      onDelete: "CASCADE",
    });
  }
}
