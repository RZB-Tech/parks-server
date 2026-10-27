import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "pg";
import { Sequelize } from "sequelize";
import { AuctionCategoryModel, CardModel, sequelize } from "../src/plugins/db/postgresql/db";
import { EnsureCardAuctionSchema } from "../src/plugins/db/postgresql/cardAuctionSchema";
import { AssignAuctionCardsService, RemoveAuctionCardsService, GetAuctionCategoryCardsService } from "../src/services/auction-category-services/AuctionCardServices";
import { AuctionCardStatus, CardStatusTypes, CardType } from "../src/models/postgresql/cards-model/enums";

// Explicit opt-in. All fixtures live in a disposable schema.
const connectionString = process.env.AUCTION_TEST_DATABASE_URL;

test("PostgreSQL auction cards preserve legacy data, enforce invariants and serialize competing assignments", {
  skip: !connectionString,
  timeout: 30_000,
}, async (t) => {
  const schema = `auction_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ connectionString });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db = new Sequelize(connectionString!, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { connectionString, options: `-c search_path=${schema}` },
  });
  t.after(async () => {
    await db.close();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  // Keep the real models/query generation while directing every query and
  // transaction into the isolated schema instead of application tables.
  t.mock.method(sequelize, "query", (sql: any, options: any) => db.query(sql, options) as any);
  t.mock.method(sequelize, "transaction", (callback: any) => db.transaction(callback) as any);
  await db.query(`
    CREATE TABLE users (id BIGINT PRIMARY KEY);
    CREATE TABLE card_batches (id BIGINT PRIMARY KEY);
    INSERT INTO users VALUES (7);
    INSERT INTO card_batches VALUES (1);
  `);
  await AuctionCategoryModel.schema(schema).sync();
  await CardModel.schema(schema).sync();
  await EnsureCardAuctionSchema(db);

  const firstCategory = await AuctionCategoryModel.create({ name: "Premium", price: 300000 });
  const secondCategory = await AuctionCategoryModel.create({ name: "Gold", price: 1000000 });
  const createCard = (number: string) => CardModel.create({
    card: number, nfc: `nfc-${number}`, batch: 1, user: null,
    status: CardStatusTypes.INACTIVE, type: CardType.CLASSIC, balance: 0,
    imported_at: new Date(), activated_at: null,
  } as any);
  const legacyCard = await createCard("000123");

  await t.test("migration works after sync on an existing table and is repeatable", async () => {
    await db.query(`ALTER TABLE cards DROP COLUMN auction_category_id CASCADE, DROP COLUMN auction_status CASCADE`);
    // This reproduces the production startup order: sync before bootstrap.
    await CardModel.schema(schema).sync();
    await EnsureCardAuctionSchema(db);
    await EnsureCardAuctionSchema(db);
    const preserved = await CardModel.findByPk(legacyCard.id);
    assert.equal(preserved!.card, "000123");
    assert.equal(preserved!.auction_category_id, null);
    assert.equal(preserved!.auction_status, null);
  });

  await t.test("a mixed invalid batch has no partial writes", async () => {
    await assert.rejects(AssignAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000123", "missing"] }));
    assert.equal((await CardModel.findByPk(legacyCard.id))!.auction_category_id, null);
  });

  await t.test("a failed write rolls back preceding updates in the same batch", async () => {
    const second = await createCard("000456");
    const update = CardModel.prototype.update;
    const failing = t.mock.method(CardModel.prototype, "update", async function (this: CardModel, values: any, options: any) {
      if (Number(this.id) === Number(second.id)) throw new Error("Simulated write failure");
      return update.call(this, values, options);
    });
    try {
      await assert.rejects(AssignAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000123", "000456"] }), /Simulated write failure/);
    } finally {
      failing.mock.restore();
    }
    for (const id of [legacyCard.id, second.id]) {
      assert.equal((await CardModel.findByPk(id))!.auction_category_id, null);
    }
  });

  await t.test("parallel assignments cannot put one card in two categories", async () => {
    const outcomes = await Promise.allSettled([
      AssignAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000123"] }),
      AssignAuctionCardsService({ auctionCategoryID: Number(secondCategory.id), cards: ["000123"] }),
    ]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = outcomes.find((result) => result.status === "rejected") as PromiseRejectedResult;
    assert.equal(rejected.reason.message, "AUCTION_CARDS_VALIDATION_FAILED");
    assert.equal(rejected.reason.errors[0].code, "CARD_ALREADY_IN_AUCTION");
    const assigned = (await CardModel.findByPk(legacyCard.id))!;
    assert.equal(assigned.auction_status, "listed");
    await RemoveAuctionCardsService({ auctionCategoryID: Number(assigned.auction_category_id), cards: ["000123"] });
    assert.equal((await CardModel.findByPk(legacyCard.id))!.auction_category_id, null);
  });

  await t.test("database constraints prevent invalid category links, states and ordinary activation", async () => {
    await assert.rejects(db.query(`UPDATE cards SET auction_category_id = 999999, auction_status = 'listed' WHERE id = :id`, { replacements: { id: legacyCard.id } }));
    await assert.rejects(db.query(`UPDATE cards SET auction_status = 'listed' WHERE id = :id`, { replacements: { id: legacyCard.id } }));
    await AssignAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000123"] });
    await assert.rejects(db.query(`UPDATE cards SET status = 'active' WHERE id = :id`, { replacements: { id: legacyCard.id } }));
    await assert.rejects(db.query(`UPDATE cards SET "user" = 7 WHERE id = :id`, { replacements: { id: legacyCard.id } }));
    await assert.rejects(db.query(`DELETE FROM auction_categories WHERE id = :id`, { replacements: { id: firstCategory.id } }));
  });

  await t.test("client listing excludes reserved, sold and deleted cards and sold cards retain their category", async () => {
    await createCard("000789");
    await createCard("000999");
    await createCard("001111");
    await AssignAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000789", "000999", "001111"] });
    await CardModel.update({ auction_status: AuctionCardStatus.RESERVED }, { where: { card: "000789" } });
    await CardModel.update({ auction_status: AuctionCardStatus.SOLD, status: CardStatusTypes.ACTIVE, user: 7 }, { where: { card: "000999" } });
    await CardModel.destroy({ where: { card: "001111" } });
    const result = await GetAuctionCategoryCardsService({ categoryID: Number(firstCategory.id) }, {}, true);
    assert.deepEqual(result.cards.map((card) => card.card), ["000123"]);
    const sold = await CardModel.findOne({ where: { card: "000999" } });
    assert.equal(Number(sold!.auction_category_id), Number(firstCategory.id));
    await assert.rejects(RemoveAuctionCardsService({ auctionCategoryID: Number(firstCategory.id), cards: ["000999"] }));
  });
});
