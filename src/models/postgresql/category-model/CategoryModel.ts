import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CategoryModel
  extends Model<CategoryModelI, TableOptionalAttributes>
  implements CategoryModelI
{
  public id!: number;
  public name!: string;
  public icon!: number;
  public color!: string;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};
  public static initialize(sequelize: Sequelize) {
    CategoryModel.init(
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
        icon: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        color: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "categories",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CategoryModel.hasMany(models.AttractionModel, {
      foreignKey: "category",
      as: "attractions",
    });
  }
}
