import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class AttractionOperatorModel
  extends Model<AttractionOperatorModelI, TableOptionalAttributes>
  implements AttractionOperatorModelI
{
  public id!: number;
  public attraction!: number;
  public operator!: number;
  public type!: import("./enums").AttractionOperatorTypes;
  public status!: import("./enums").AttractionOperatorStatusTypes;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};
  public static initialize(sequelize: Sequelize) {
    AttractionOperatorModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        attraction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        operator: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("main", "assistant"),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "attraction_operators",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    AttractionOperatorModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attraction_operator",
    });
    AttractionOperatorModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });
  }
}
