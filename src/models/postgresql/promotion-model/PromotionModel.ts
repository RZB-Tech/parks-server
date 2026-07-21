import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { PromotionStatusTypes, PromotionTypes } from "./enums";

export class PromotionModel
  extends Model<PromotionModelI, TableOptionalAttributes>
  implements PromotionModelI
{
  public id!: number;

  public code!: string;
  public name!: string;
  public description!: string | null;

  public type!: PromotionTypes;
  public status!: PromotionStatusTypes;

  public discount_percent!: number;

  public starts_at!: Date | null;
  public ends_at!: Date | null;

  public start_date!: string | null;
  public end_date!: string | null;
  public start_time!: string | null;
  public end_time!: string | null;
  public weekdays!: number[] | null;

  public file!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static initialize(sequelize: Sequelize) {
    PromotionModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },

        name: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        type: {
          type: DataTypes.ENUM(...Object.values(PromotionTypes)),
          allowNull: false,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(PromotionStatusTypes)),
          allowNull: false,
          defaultValue: PromotionStatusTypes.ACTIVE,
        },

        discount_percent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          validate: {
            min: 0.01,
            max: 100,
          },
        },

        /*
         * Bir martalik aksiya uchun aniq sana-vaqt.
         */
        starts_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        ends_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        /*
         * Regular aksiya uchun sana oralig‘i.
         */
        start_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },

        end_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },

        start_time: {
          type: DataTypes.TIME,
          allowNull: true,
        },

        end_time: {
          type: DataTypes.TIME,
          allowNull: true,
        },

        /*
         * 1 = Dushanba
         * 7 = Yakshanba
         */
        weekdays: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: true,
        },

        file: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "promotions",
        underscored: true,
        timestamps: true,
        paranoid: true,

        indexes: [
          { fields: ["status"] },
          { fields: ["type"] },
          { fields: ["start_date", "end_date"] },
          { fields: ["starts_at", "ends_at"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    PromotionModel.belongsTo(models.FileModel, {
      foreignKey: "file",
      as: "files",
    });

    PromotionModel.hasMany(models.PromotionAttractionModel, {
      foreignKey: "promotion",
      as: "promotion_attractions",
    });
  }
}
