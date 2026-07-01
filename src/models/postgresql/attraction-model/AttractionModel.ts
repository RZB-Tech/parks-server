import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class AttractionModel
  extends Model<AttractionModelI, TableOptionalAttributes>
  implements AttractionModelI
{
  public id!: number;
  public device!: number;
  public name!: string;
  public manufacturer!: string;
  public category!: number;
  public status!: import("./enums").AttractionStatusTypes;
  public dashboard_file!: number;
  public main_file!: number;
  public files!: Array<number>;
  public price!: number;
  public duration!: number;
  public seats!: number;
  public age_limit!: number;
  public min_height!: number;
  public max_weight!: number;
  public description!: string;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    AttractionModel.init(
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
        manufacturer: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        category: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "maintenance", "closed"),
          defaultValue: "active",
          allowNull: false,
        },
        dashboard_file: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        main_file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        files: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: false,
        },
        price: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        seats: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        age_limit: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        min_height: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        max_weight: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "attractions",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    AttractionModel.hasMany(models.AttractionOperatorModel, {
      foreignKey: "attraction",
      as: "attraction_operator",
      onDelete: "CASCADE",
    });
    AttractionModel.belongsTo(models.CategoryModel, {
      foreignKey: "category",
      as: "categories",
    });
  }
}
