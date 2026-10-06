import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { UzumTransactionStateTypes } from "./enums";

export class UzumTransactionModel
  extends Model<UzumTransactionModelI, TableOptionalAttributes>
  implements UzumTransactionModelI
{
  public id!: number;
  public payment_order!: number;
  public card_transaction!: number | null;
  public uzum_order_id!: string;
  public merchant_operation_id!: string | null;
  public order_number!: string;
  public amount!: number;
  public redirect_url!: string | null;
  public service_id!: number | null;
  public state!: UzumTransactionStateTypes;
  public operation_type!: string | null;
  public rrn!: string | null;
  public card_type!: number | null;
  public binding_id!: string | null;
  public payment_source!: string | null;
  public tariff!: string | null;
  public processing_reference_number!: string | null;
  public phone!: string | null;
  public raw_callback!: Record<string, unknown> | null;
  public raw_create!: Record<string, unknown> | null;
  public raw_confirm!: Record<string, unknown> | null;
  public raw_reverse!: Record<string, unknown> | null;
  public registered_at!: Date;
  public completed_at!: Date | null;
  public declined_at!: Date | null;
  public refunded_at!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    UzumTransactionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        payment_order: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },
        card_transaction: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        uzum_order_id: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        merchant_operation_id: {
          type: DataTypes.STRING(64),
          allowNull: true,
          unique: true,
        },
        order_number: {
          type: DataTypes.STRING(36),
          allowNull: false,
          unique: true,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        redirect_url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        service_id: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        state: {
          type: DataTypes.ENUM(...Object.values(UzumTransactionStateTypes)),
          allowNull: false,
          defaultValue: UzumTransactionStateTypes.REGISTERED,
        },
        operation_type: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        rrn: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        card_type: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        binding_id: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        payment_source: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        tariff: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        processing_reference_number: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        raw_callback: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        raw_create: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        raw_confirm: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        raw_reverse: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        registered_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        declined_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        refunded_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "uzum_transactions",
        timestamps: true,
        indexes: [{ fields: ["state"] }, { fields: ["created_at"] }],
      },
    );
  }

  public static associate(models: ModelsType) {
    UzumTransactionModel.belongsTo(models.PaymentOrderModel, {
      foreignKey: "payment_order",
      as: "payment_order_data",
    });
    UzumTransactionModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "card_transaction",
      as: "card_transaction_data",
    });
  }
}
