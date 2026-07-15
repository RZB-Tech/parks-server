import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { AttractionReportStatusTypes, AttractionReportTypes } from "./enums";

export class AttractionReportModel
  extends Model<AttractionReportModelI, TableOptionalAttributes>
  implements AttractionReportModelI
{
  public id!: number;

  public attraction!: number;
  public operator!: number | null;

  public status!: import("./enums").AttractionReportStatusTypes;
  public description!: string | null;
  public report_type!: import("./enums").AttractionReportTypes;
  public zreport!: number | null;

  public opened_at!: Date;
  public stopped_at!: Date | null;
  public closed_at!: Date | null;
  public confirmed_at!: Date | null;
  public confirmed_by!: number | null;

  public total_rounds!: number;
  public total_people!: number;

  public total_offline!: number;
  public total_online!: number;
  public total_virtual!: number;
  public total_classic!: number;
  public total_vip!: number;
  public total_organization!: number;

  public paid_amount!: number;
  public total_amount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    AttractionReportModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        attraction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(
            AttractionReportStatusTypes.OPEN,
            AttractionReportStatusTypes.STOPPED,
            AttractionReportStatusTypes.CLOSED,
            AttractionReportStatusTypes.CONFIRMED,
          ),
          allowNull: false,
          defaultValue: AttractionReportStatusTypes.OPEN,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        report_type: {
          type: DataTypes.ENUM(...Object.values(AttractionReportTypes)),
          allowNull: false,
        },
        zreport: {
          type: DataTypes.BIGINT,
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

        confirmed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        confirmed_by: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        total_rounds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_people: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_offline: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_online: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        total_virtual: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        total_classic: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_vip: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_organization: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        paid_amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },

        total_amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "attraction_reports",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    AttractionReportModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
    });

    AttractionReportModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });
    //  AttractionReportModel.hasMany(models.AttractionRoundModel, {
    //    foreignKey: "report",
    //    as: "rounds",
    //  });
  }
}
