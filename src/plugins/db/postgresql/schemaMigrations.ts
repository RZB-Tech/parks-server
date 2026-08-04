import { DataTypes, Sequelize } from "sequelize";

export const ApplySchemaMigrations = async (sequelize: Sequelize) => {
  const queryInterface = sequelize.getQueryInterface();

  const attractionColumns = await queryInterface.describeTable("attractions");

  if (!attractionColumns.size) {
    await queryInterface.addColumn("attractions", "size", {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1,
    });
  }

  if (attractionColumns.price && !attractionColumns.price.allowNull) {
    await queryInterface.changeColumn("attractions", "price", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }

  const transactionColumns =
    await queryInterface.describeTable("card_transactions");

  if (!transactionColumns.attraction_tariff) {
    await queryInterface.addColumn("card_transactions", "attraction_tariff", {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "attraction_tariffs",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  }

  if (!transactionColumns.tariff_name) {
    await queryInterface.addColumn("card_transactions", "tariff_name", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }

  const transactionIndexes = (await queryInterface.showIndex(
    "card_transactions",
  )) as unknown as Array<{
    fields: Array<{ attribute: string }>;
  }>;

  if (
    !transactionIndexes.some((index) =>
      index.fields?.some((field) => field.attribute === "attraction_tariff"),
    )
  ) {
    await queryInterface.addIndex("card_transactions", ["attraction_tariff"], {
      name: "card_transactions_attraction_tariff",
    });
  }
};
