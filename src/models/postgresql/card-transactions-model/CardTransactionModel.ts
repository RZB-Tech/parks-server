import { DataTypes, Model, Sequelize } from "sequelize";

import { ModelsType } from "../../../plugins/db/postgresql/db";

import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "./enums";
import { PromotionTypes } from "../promotion-model/enums";

export class CardTransactionModel
  extends Model<CardTransactionModelI, TableOptionalAttributes>
  implements CardTransactionModelI
{
  public id!: number;

  public card!: number;

  public operator!: number | null;
  public cashbox!: number | null;
  public attraction!: number | null;
  public xreport!: number | null;

  public type!: CardTransactionType;

  public amount!: number;
  public balance_before!: number;
  public balance_after!: number;

  /*
   * Promotion snapshot
   */
  public promotion!: number | null;

  public promotion_code!: string | null;
  public promotion_name!: string | null;
  public promotion_type!: PromotionTypes | null;

  public discount_percent!: number;

  /*
   * Attraction payment snapshot
   */
  public people_count!: number;

  public original_unit_price!: number;
  public sale_unit_price!: number;

  public original_amount!: number;
  public discount_amount!: number;

  /*
   * Payment ma’lumotlari
   */
  public payment_type!: PaymentType;

  public payment_card_type!: PaymentCardType | null;
  public payment_service!: PaymentServiceType | null;

  public status!: CardTransactionStatusTypes;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static initialize(sequelize: Sequelize) {
    CardTransactionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        card: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        cashbox: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        attraction: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        xreport: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        type: {
          type: DataTypes.ENUM(...Object.values(CardTransactionType)),
          allowNull: false,
        },

        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        balance_before: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        balance_after: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        /*
         * Promotion
         */
        promotion: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        promotion_code: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },

        promotion_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        promotion_type: {
          type: DataTypes.ENUM(...Object.values(PromotionTypes)),
          allowNull: true,
        },

        discount_percent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
        },

        /*
         * Payment snapshot
         */
        people_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        original_unit_price: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        sale_unit_price: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        original_amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        discount_amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        /*
         * Payment type
         */
        payment_type: {
          type: DataTypes.ENUM(...Object.values(PaymentType)),
          allowNull: false,
        },

        payment_card_type: {
          type: DataTypes.ENUM(...Object.values(PaymentCardType)),
          allowNull: true,
        },

        payment_service: {
          type: DataTypes.ENUM(...Object.values(PaymentServiceType)),
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(CardTransactionStatusTypes)),
          allowNull: false,
          defaultValue: CardTransactionStatusTypes.SUCCESS,
        },
      },
      {
        sequelize,

        tableName: "card_transactions",

        timestamps: true,
        paranoid: true,
        underscored: true,

        indexes: [
          {
            fields: ["card"],
          },
          {
            fields: ["xreport"],
          },
          {
            fields: ["attraction"],
          },
          {
            fields: ["promotion"],
          },
          {
            fields: ["type", "status"],
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    CardTransactionModel.belongsTo(models.CardModel, {
      foreignKey: "card",
      as: "cards",
    });

    CardTransactionModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });

    CardTransactionModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
    });

    CardTransactionModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
    });

    CardTransactionModel.belongsTo(models.AttractionReportModel, {
      foreignKey: "xreport",
      as: "xreports",
    });

    CardTransactionModel.belongsTo(models.PromotionModel, {
      foreignKey: "promotion",
      as: "promotions",
    });
  }
}
