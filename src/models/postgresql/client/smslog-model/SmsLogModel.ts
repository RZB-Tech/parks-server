import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../../plugins/db/postgresql/db";
import { SmsProviderTypes, SmsStatusTypes, SmsTypes } from "./enums";

export class SmsLogModel
  extends Model<SmsLogModelI, TableOptionalAttributes>
  implements SmsLogModelI
{
  public id!: number;
  public phone_number!: string;
  public type!: import("./enums").SmsTypes;
  public provider!: import("./enums").SmsProviderTypes;
  public status!: import("./enums").SmsStatusTypes;

  public sender!: string | null;
  public template!: string | null;

  public message!: string | null;

  public provider_message_id!: string | null;

  public attempts!: number;

  public error_code!: string | null;
  public error_message!: string | null;

  public sent_at!: Date | null;
  public delivered_at!: Date | null;
  public failed_at!: Date | null;

  public metadata!: Record<string, unknown> | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    SmsLogModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        phone_number: {
          type: DataTypes.STRING(12),
          allowNull: false,
        },

        type: {
          type: DataTypes.ENUM(...Object.values(SmsTypes)),
          allowNull: false,
        },

        provider: {
          type: DataTypes.ENUM(...Object.values(SmsProviderTypes)),
          allowNull: false,
          defaultValue: SmsProviderTypes.ESKIZ,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(SmsStatusTypes)),
          allowNull: false,
          defaultValue: SmsStatusTypes.PENDING,
        },

        sender: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },

        template: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },

        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        provider_message_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        error_code: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },

        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        delivered_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        failed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "sms_logs",
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["phone_number"] },
          { fields: ["type"] },
          { fields: ["status"] },
          { fields: ["provider_message_id"] },
          { fields: ["created_at"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    SmsLogModel.hasMany(models.OtpModel, {
      foreignKey: "last_sms_log",
      as: "otps",
    });
  }
}
