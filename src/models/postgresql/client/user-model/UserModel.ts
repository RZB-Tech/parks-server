import { Model, DataTypes, Sequelize } from "sequelize";
import { UserStatusTypes } from "./enums";
import { ModelsType } from "../../../../plugins/db/postgresql/db";

export class UserModel
  extends Model<UserModelI, TableOptionalAttributes>
  implements UserModelI
{
  public id!: number;

  public telegram_id!: number;
  public telegram_chat_id!: string | null;
  public telegram_username!: string | null;
  public telegram_avatar!: string | null;
  public telegram_first_name!: string;
  public telegram_last_name!: string | null;

  public fullname!: string;

  public phone_number!: string;
  public date_of_birth!: string;

  public status!: import("./enums").UserStatusTypes;

  public phone_verified_at!: Date | null;
  public registered_at!: Date | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    UserModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        telegram_id: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },

        telegram_chat_id: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        telegram_username: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        telegram_avatar: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        telegram_first_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        telegram_last_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        fullname: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        phone_number: {
          type: DataTypes.STRING(12),
          allowNull: false,
          unique: true,
        },

        date_of_birth: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(UserStatusTypes)),
          allowNull: false,
          defaultValue: UserStatusTypes.PENDING,
        },

        phone_verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        registered_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "users",
        timestamps: true,
        paranoid: true,

        indexes: [
          {
            unique: true,
            fields: ["telegram_id"],
          },
          {
            unique: true,
            fields: ["phone_number"],
          },
          { fields: ["status"] },
          { fields: ["telegram_username"] },
          { fields: ["created_at"] },
        ],
      },
    );
  }

  public static associate(_models: ModelsType) {}
}
