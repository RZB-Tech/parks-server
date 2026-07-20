import { Model, DataTypes, Sequelize } from "sequelize";

import { NewsStatusTypes } from "./enums";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class NewsModel
  extends Model<NewsModelI, TableOptionalAttributes>
  implements NewsModelI
{
  public id!: number;

  public title!: string;
  public description!: string;

  public file!: number;

  public status!: import("./enums").NewsStatusTypes;

  public publish_at!: Date;
  public expired_at!: Date;

  public published_at!: Date | null;
  public archived_at!: Date | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    NewsModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },

        file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(NewsStatusTypes)),
          allowNull: false,
        },

        publish_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        expired_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        published_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        archived_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "news",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    NewsModel.belongsTo(models.FileModel, {
      foreignKey: "file",
      as: "files",
    });
  }
}
