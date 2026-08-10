import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "./enums";

export class PaymentOrderModel
  extends Model<PaymentOrderModelI, TableOptionalAttributes>
  implements PaymentOrderModelI
{
  public id!: number;

  public user!: number;
  public card!: number;

  public provider!: PaymentProviderTypes;
  public purpose!: PaymentOrderPurposeTypes;
  public status!: PaymentOrderStatusTypes;

  public amount!: number;

  public expires_at!: Date | null;
  public performed_at!: Date | null;
  public cancelled_at!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    PaymentOrderModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        user: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        card: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        provider: {
          type: DataTypes.ENUM(...Object.values(PaymentProviderTypes)),
          allowNull: false,
        },

        purpose: {
          type: DataTypes.ENUM(...Object.values(PaymentOrderPurposeTypes)),
          allowNull: false,
          defaultValue: PaymentOrderPurposeTypes.CARD_TOPUP,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(PaymentOrderStatusTypes)),
          allowNull: false,
          defaultValue: PaymentOrderStatusTypes.PENDING,
        },

        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          validate: {
            min: 1,
          },
        },

        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        performed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "payment_orders",
        timestamps: true,
        indexes: [
          {
            fields: ["user", "created_at"],
          },
          {
            fields: ["card", "status"],
          },
          {
            fields: ["provider", "status"],
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    PaymentOrderModel.belongsTo(models.UserModel, {
      foreignKey: "user",
      as: "users",
    });

    PaymentOrderModel.belongsTo(models.CardModel, {
      foreignKey: "card",
      as: "cards",
    });

    PaymentOrderModel.hasOne(models.PaymeTransactionModel, {
      foreignKey: "payment_order",
      as: "payme_transaction",
    });
    PaymentOrderModel.hasOne(models.ClickTransactionModel, {
      foreignKey: "payment_order",
      as: "click_transaction",
    });
    PaymentOrderModel.hasOne(models.UzumTransactionModel, {
      foreignKey: "payment_order",
      as: "uzum_transaction",
    });
  }
}
