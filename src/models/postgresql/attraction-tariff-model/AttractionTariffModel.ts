import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { AttractionTariffStatusTypes } from "./enums";

export class AttractionTariffModel
  extends Model<AttractionTariffModelI, TableOptionalAttributes>
  implements AttractionTariffModelI
{
  public id!: number;
  public attraction!: number;
  public name!: string;
  public price!: number;
  public status!: AttractionTariffStatusTypes;
  public sort_order!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  public static initialize(sequelize: Sequelize) {
    AttractionTariffModel.init(
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
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        price: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(AttractionTariffStatusTypes)),
          allowNull: false,
          defaultValue: AttractionTariffStatusTypes.ACTIVE,
        },
        sort_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "attraction_tariffs",
        underscored: true,
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["attraction", "status"] },
          {
            unique: true,
            fields: ["attraction", "name"],
            name: "unique_attraction_tariff_name",
            where: {
              status: AttractionTariffStatusTypes.ACTIVE,
            },
          },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    AttractionTariffModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
      onDelete: "CASCADE",
    });

    AttractionTariffModel.hasMany(models.CardTransactionModel, {
      foreignKey: "attraction_tariff",
      as: "transactions",
      onDelete: "SET NULL",
    });
  }
}
