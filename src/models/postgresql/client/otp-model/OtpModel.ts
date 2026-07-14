import { Model, DataTypes, Sequelize } from "sequelize";
import { OtpTypes } from "./enums";
import { ModelsType } from "../../../../plugins/db/postgresql/db";

export class OtpModel
  extends Model<OtpModelI, TableOptionalAttributes>
  implements OtpModelI
{
  public id!: number;

  public phone_number!: string;

  public purpose!: import("./enums").OtpTypes;

  public code_hash!: string;

  public send_attempts!: number;
  public send_window_started_at!: Date | null;
  public send_blocked_until!: Date | null;

  public verify_attempts!: number;
  public verify_blocked_until!: Date | null;

  public expires_at!: Date;
  public resend_at!: Date;

  public verified_at!: Date | null;

  public last_sms_log!: number | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    OtpModel.init(
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

        purpose: {
          type: DataTypes.ENUM(...Object.values(OtpTypes)),
          allowNull: false,
        },

        code_hash: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },

        send_attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        send_window_started_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        send_blocked_until: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        verify_attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        verify_blocked_until: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        resend_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        last_sms_log: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
      },
      {
        sequelize,

        underscored: true,
        tableName: "otps",

        timestamps: true,
        paranoid: true,

        indexes: [
          { unique: true, fields: ["phone_number", "purpose"] },
          { fields: ["phone_number"] },
          { fields: ["purpose"] },
          { fields: ["expires_at"] },
          { fields: ["resend_at"] },
          { fields: ["send_blocked_until"] },
          { fields: ["verify_blocked_until"] },
          { fields: ["last_sms_log"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    OtpModel.belongsTo(models.SmsLogModel, {
      foreignKey: "last_sms_log",
      as: "smsLog",
    });
  }
}
