import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { CashboxReportStatusTypes, CashboxReportTypes } from "./enums";

export class CashboxReportModel
  extends Model<CashboxReportModelI, TableOptionalAttributes>
  implements CashboxReportModelI
{
  public id!: number;
  public operator!: number | null;
  public cashbox!: number;
  public checked_by!: number | null;
  public report_type!: import("./enums").CashboxReportTypes;
  public zreport!: number | null;
  public report_date!: Date;
  public status!: import("./enums").CashboxReportStatusTypes;
  public description!: string | null;
  public opened_at!: Date;
  public stopped_at!: Date | null;
  public closed_at!: Date | null;
  public total_amount!: number;
  public cash_amount!: number;
  public card_amount!: number;
  public online_amount!: number;
  public uzcard_amount!: number;
  public humo_amount!: number;
  public uzum_amount!: number;
  public payme_amount!: number;
  public click_amount!: number;
  public activated_cards_count!: number;
  public relationed_cards_count!: number;
  public transactions_count!: number;
  public xreports_count!: number | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    CashboxReportModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        cashbox: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        checked_by: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        report_type: {
          type: DataTypes.ENUM(...Object.values(CashboxReportTypes)),
          allowNull: false,
        },

        zreport: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        report_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(...Object.values(CashboxReportStatusTypes)),
          allowNull: false,
          defaultValue: CashboxReportStatusTypes.OPEN,
        },

        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        opened_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },

        stopped_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        closed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        total_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        cash_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        card_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        online_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        uzcard_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        humo_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        uzum_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        payme_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        click_amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        activated_cards_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        relationed_cards_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        transactions_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        xreports_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "cashbox_reports",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CashboxReportModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });

    CashboxReportModel.belongsTo(models.CashboxModel, {
      foreignKey: "cashbox",
      as: "cashboxes",
    });
  }
}
