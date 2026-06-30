import { Model, DataTypes, Sequelize, Association } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { AttractionRoundStatusTypes } from "./enums";

export class AttractionRoundModel
  extends Model<AttractionRoundModelI, TableOptionalAttributes>
  implements AttractionRoundModelI
{
  public id!: number;

  public report!: number;
  public attraction!: number;
  public operator!: number;

  public round_number!: number;
  public status!: import("./enums").AttractionRoundStatusTypes;

  public people_count!: number;

  public offline_count!: number;
  public online_count!: number;
  public vip_count!: number;
  public guest_count!: number;
  public park_staff_count!: number;

  public paid_amount!: number;
  public total_amount!: number;

  public started_at!: Date;
  public finished_at!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    AttractionRoundModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        report: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        attraction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        operator: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        round_number: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        status: {
          type: DataTypes.ENUM(
            AttractionRoundStatusTypes.OPEN,
            AttractionRoundStatusTypes.FINISHED,
            AttractionRoundStatusTypes.CANCELLED,
          ),
          allowNull: false,
          defaultValue: AttractionRoundStatusTypes.OPEN,
        },

        people_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        offline_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        online_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        vip_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        guest_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        park_staff_count: {
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

        started_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },

        finished_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "attraction_rounds",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
   AttractionRoundModel.belongsTo(models.AttractionReportModel, {
     foreignKey: "report",
     as: "reports",
   });

   AttractionRoundModel.belongsTo(models.AttractionModel, {
     foreignKey: "attraction",
     as: "attractions",
   });

   AttractionRoundModel.belongsTo(models.EmployeeModel, {
     foreignKey: "operator",
     as: "operators",
   });
  }
}
