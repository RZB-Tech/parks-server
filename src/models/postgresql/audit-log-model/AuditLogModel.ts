import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { AuditActionTypes } from "./enums";

export class AuditLogModel
  extends Model<AuditLogModelI, CreateAuditLogModelI>
  implements AuditLogModelI
{
  public id!: number;
  public employee_id!: number | null;
  public employee_name!: string;
  public employee_role!: string;
  public action!: AuditActionTypes;
  public entity_type!: string;
  public entity_id!: string | null;
  public old_values!: Record<string, unknown> | null;
  public new_values!: Record<string, unknown> | null;
  public route!: string | null;
  public method!: string | null;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public readonly created_at!: Date;

  public static initialize(sequelize: Sequelize) {
    AuditLogModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        employee_id: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        employee_name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        employee_role: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        action: {
          type: DataTypes.ENUM(...Object.values(AuditActionTypes)),
          allowNull: false,
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        entity_id: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        old_values: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        new_values: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        route: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        method: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        ip_address: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "audit_logs",
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          { fields: ["created_at"] },
          { fields: ["employee_id", "created_at"] },
          { fields: ["employee_role", "created_at"] },
          { fields: ["action", "created_at"] },
          { fields: ["entity_type", "entity_id"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    AuditLogModel.belongsTo(models.EmployeeModel, {
      foreignKey: "employee_id",
      as: "employee",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
