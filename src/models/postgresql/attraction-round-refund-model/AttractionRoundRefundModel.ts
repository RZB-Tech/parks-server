import { DataTypes, Model, Sequelize } from "sequelize";
import { ModelsType } from "../../../plugins/db/postgresql/db";

export class AttractionRoundRefundModel
  extends Model<AttractionRoundRefundModelI, TableOptionalAttributes>
  implements AttractionRoundRefundModelI
{
  public id!: number;
  public round!: number;
  public attraction!: number;
  public operator!: number;
  public card!: number;
  public original_transaction!: number;
  public refund_transaction!: number;
  public amount!: number;
  public people_count!: number;
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    AttractionRoundRefundModel.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        round: {
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
        card: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        original_transaction: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        refund_transaction: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        people_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "attraction_round_refunds",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["round"] },
          { fields: ["attraction"] },
          { fields: ["operator"] },
          { fields: ["card"] },
          { fields: ["original_transaction"] },
          { fields: ["created_at"] },
          { fields: ["attraction", "created_at"] },
        ],
      },
    );
  }

  public static associate(models: ModelsType) {
    AttractionRoundRefundModel.belongsTo(models.AttractionRoundModel, {
      foreignKey: "round",
      as: "rounds",
    });
    AttractionRoundRefundModel.belongsTo(models.AttractionModel, {
      foreignKey: "attraction",
      as: "attractions",
    });
    AttractionRoundRefundModel.belongsTo(models.EmployeeModel, {
      foreignKey: "operator",
      as: "operators",
    });
    AttractionRoundRefundModel.belongsTo(models.CardModel, {
      foreignKey: "card",
      as: "cards",
    });
    AttractionRoundRefundModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "original_transaction",
      as: "original_transactions",
    });
    AttractionRoundRefundModel.belongsTo(models.CardTransactionModel, {
      foreignKey: "refund_transaction",
      as: "refund_transactions",
    });
  }
}
