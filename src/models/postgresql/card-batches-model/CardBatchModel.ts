import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { CardType } from "../cards-model/enums";

export class CardBatchModel
  extends Model<CardBatchModelI, TableOptionalAttributes>
  implements CardBatchModelI
{
  public id!: number;
  public name!: string;
  public type!: CardType;
  public total_cards!: number;
  public inactive_cards!: number;
  public active_cards!: number;
  public frozen_cards!: number;
  public blocked_cards!: number;
  public lost_cards!: number;
  public tethered_cards!: number;
  public imported_by!: number;
  public imported_at!: Date;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};

  public static initialize(sequelize: Sequelize) {
    CardBatchModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM(...Object.values(CardType)),
          allowNull: true,
        },
        total_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        inactive_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        active_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        frozen_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        blocked_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lost_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        tethered_cards: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        imported_by: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        imported_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "card_batches",
        underscored: true,
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CardBatchModel.hasMany(models.CardModel, {
      foreignKey: "batch",
      onDelete: "CASCADE",
    });
  }
}
