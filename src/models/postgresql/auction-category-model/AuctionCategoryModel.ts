import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";

export class AuctionCategoryModel extends Model<
  InferAttributes<AuctionCategoryModel>,
  InferCreationAttributes<AuctionCategoryModel>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare price: number;
  declare is_active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
  declare readonly deleted_at: CreationOptional<Date | null>;

  public static initialize(sequelize: Sequelize) {
    AuctionCategoryModel.init(
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
          validate: { notEmpty: true, len: [1, 255] },
        },
        price: {
          type: DataTypes.BIGINT,
          allowNull: false,
          validate: { isInt: true, min: 1, max: Number.MAX_SAFE_INTEGER },
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: "auction_categories",
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        indexes: [{ fields: ["is_active", "price", "id"] }],
      },
    );
  }
}
