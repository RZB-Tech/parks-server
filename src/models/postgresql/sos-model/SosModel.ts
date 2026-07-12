import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class SosModel
  extends Model<SosModelI, TableOptionalAttributes>
  implements SosModelI
{
  public id!: number;

  public attraction_operator!: number | null;
  public cashbox_operator!: number | null;

  public description!: string;
  public fixed_at!: Date | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    SosModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },

        attraction_operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        cashbox_operator: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 2000],
          },
        },
        fixed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "sos",
        timestamps: true,
        paranoid: true,

        indexes: [
          {
            fields: ["attraction_operator"],
          },
          {
            fields: ["cashbox_operator"],
          },
          {
            fields: ["created_at"],
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    SosModel.belongsTo(models.AttractionOperatorModel, {
      foreignKey: "attraction_operator",
      as: "attractionOperator",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    SosModel.belongsTo(models.CashboxOperatorModel, {
      foreignKey: "cashbox_operator",
      as: "cashboxOperator",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
}
