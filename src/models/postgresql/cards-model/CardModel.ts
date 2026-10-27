import { Model, DataTypes, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";
import { AuctionCardStatus } from "./enums";

export class CardModel
  extends Model<CardsModelI, TableOptionalAttributes>
  implements CardsModelI
{
  public id!: number;
  public user!: number | null;
  public batch!: number;
  public card!: string;
  public nfc!: string;
  public bind_token_hash!: string | null;
  public status!: import("./enums").CardStatusTypes;
  public type!: import("./enums").CardType;
  public balance!: number;
  public imported_at!: Date;
  public activated_at!: Date | null;
  public bound_at!: Date | null;
  public returned_at!: Date | null;
  public return_description!: string | null;
  public auction_category_id!: number | null;
  public auction_status!: AuctionCardStatus | null;

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
        user: {
          type: DataTypes.BIGINT,
          allowNull: true,
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
        bind_token_hash: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "active",
            "inactive",
            "blocked",
          "lost",
          "frozen",
          "returned",
          ),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("classic", "vip", "organization", "virtual"),
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
        bound_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        returned_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        return_description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        auction_category_id: {
          type: DataTypes.BIGINT,
          allowNull: true,
          defaultValue: null,
        },
        auction_status: {
          type: DataTypes.STRING(16),
          allowNull: true,
          defaultValue: null,
          validate: { isIn: [Object.values(AuctionCardStatus)] },
        },
      },
      {
        sequelize,
        underscored: true,
        tableName: "cards",
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["type", "activated_at"] },
          { fields: ["user", "type", "activated_at"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    CardModel.belongsTo(models.AuctionCategoryModel, {
      foreignKey: "auction_category_id",
      as: "auction_category",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CardModel.belongsTo(models.UserModel, {
      foreignKey: "user",
      as: "users",
      onUpdate: "CASCADE",
    });

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
