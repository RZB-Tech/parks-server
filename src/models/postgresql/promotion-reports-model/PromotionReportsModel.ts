import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { PromotionTypes } from "../promotion-model/enums";

export class PromotionReportModel
  extends Model<PromotionReportModelI, TableOptionalAttributes>
  implements PromotionReportModelI
{
  public id!: number;

  public report_date!: string;

  public attraction!: number;
  public xreport!: number;
  public zreport!: number;

  public promotion!: number | null;
  public promotion_key!: string;

  /*
   * Promotion snapshot
   */
  public promotion_code!: string | null;
  public promotion_name!: string | null;
  public promotion_type!: PromotionTypes | null;

  public discount_percent!: number;

  public original_unit_price!: number;
  public sale_unit_price!: number;

  /*
   * Umumiy statistika
   */
  public transactions_count!: number;
  public total_people!: number;

  /*
   * Card type bo‘yicha odamlar soni
   */
  public total_virtual!: number;
  public total_classic!: number;
  public total_vip!: number;
  public total_organization!: number;

  /*
   * Payment source bo‘yicha odamlar soni
   */
  public total_online!: number;
  public total_offline!: number;

  /*
   * Summalar
   */
  public original_amount!: number;
  public discount_amount!: number;
  public paid_amount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    PromotionReportModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        report_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },

        attraction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        xreport: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        zreport: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        promotion: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        /*
         * Misollar:
         *
         * promotion:7:20:12000
         * promotion:7:15:12750
         * classic:15000
         */
        promotion_key: {
          type: DataTypes.STRING(150),
          allowNull: false,
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

        transactions_count: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_people: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_virtual: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_classic: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_vip: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_organization: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_online: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_offline: {
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

        paid_amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,

        tableName: "promotion_reports",

        timestamps: true,
        underscored: true,

        indexes: [
          {
            unique: true,
            fields: ["xreport", "promotion_key"],
          },
          {
            fields: ["xreport"],
          },
          {
            fields: ["zreport", "attraction"],
          },
          {
            fields: ["report_date", "attraction"],
          },
          {
            fields: ["promotion", "report_date"],
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    PromotionReportModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
    });

    PromotionReportModel.belongsTo(models.AttractionReportModel, {
      foreignKey: "xreport",
      as: "xreports",
    });

    PromotionReportModel.belongsTo(models.AttractionReportModel, {
      foreignKey: "zreport",
      as: "zreports",
    });

    PromotionReportModel.belongsTo(models.PromotionModel, {
      foreignKey: "promotion",
      as: "promotions",
    });
  }
}
