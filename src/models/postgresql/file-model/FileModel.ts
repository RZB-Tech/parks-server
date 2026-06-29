import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class FileModel
  extends Model<FileModelI, TableOptionalAttributes>
  implements FileModelI
{
  public id!: number;
  public name!: string;
  public size!: number;
  public type!: string;
  public bucket!: string;
  public key!: string;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {
    task: Association<FileModel, Model>;
  };

  public static initialize(sequelize: Sequelize) {
    FileModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        size: {
          type: DataTypes.BIGINT,
          defaultValue: 0,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        bucket: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        key: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "files",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {}
}
