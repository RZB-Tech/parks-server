// models/promotion-models/PromotionAttractionModel.ts

import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class PromotionAttractionModel
  extends Model<PromotionAttractionModelI, TableOptionalAttributes>
  implements PromotionAttractionModelI
{
  public id!: number;

  public promotion!: number;
  public attraction!: number;

  public original_price!: number;
  public discounted_price!: number;

  public sort_order!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static initialize(sequelize: Sequelize) {
    PromotionAttractionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        promotion: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        attraction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        /*
         * Aksiya yaratilgan vaqtdagi attraction narxi.
         */
        original_price: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        /*
         * Chegirmadan keyingi bitta odam narxi.
         */
        discounted_price: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        sort_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "promotion_attractions",
        underscored: true,
        timestamps: true,
        paranoid: true,

        indexes: [
          {
            unique: true,
            fields: ["promotion", "attraction"],
            name: "unique_promotion_attraction",
          },
          { fields: ["attraction"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    PromotionAttractionModel.belongsTo(models.PromotionModel, {
      foreignKey: "promotion",
      as: "promotions",
    });

    PromotionAttractionModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
    });
  }
}
