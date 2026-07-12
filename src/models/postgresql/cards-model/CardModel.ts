import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class CardModel
  extends Model<CardsModelI, TableOptionalAttributes>
  implements CardsModelI
{
  public id!: number;
  public batch!: number;
  public card!: string;
  public nfc!: string;
  public status!: import("./enums").CardStatusTypes;
  public type!: import("./enums").CardType;
  public balance!: number;
  public imported_at!: Date;
  public activated_at!: Date | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  public static associations: {};
  public static initialize(sequelize: Sequelize) {
    CardModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        batch: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        card: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        nfc: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "blocked", "lost", "frozen"),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("classic", "vip", "organization"),
          allowNull: false,
        },
        balance: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0.0,
        },
        imported_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        activated_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "cards",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  public static associate(models: ModelsType) {
    CardModel.belongsTo(models.CardBatchModel, {
      foreignKey: "batch",
      as: "batches",
    });
    CardModel.hasMany(models.CardTransactionModel, {
      foreignKey: "card",
      as: "transactions",
      onDelete: "CASCADE",
    });
  }
}
