import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test, TestContext } from "node:test";
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { AppError } from "../src/exceptions";
import { AuctionCardStatus, CardStatusTypes, CardType } from "../src/models/postgresql/cards-model/enums";
import {
  AuctionCategoryModel, CardModel, EmployeeModel, RoleModel, UserModel,
  CashboxReportModel, CardTransactionModel, sequelize,
} from "../src/plugins/db/postgresql/db";
import AuctionCategoryRouter from "../src/routes/auction-category-routes/AuctionCategoryRoutes";
import ClientAuctionCategoryRouter from "../src/routes/client/auction-category-routes/AuctionCategoryRoutes";
import CardsRouter from "../src/routes/card-routes/CardsRoutes";
import { AssignAuctionCardsService, RemoveAuctionCardsService, GetAuctionCategoryCardsService } from "../src/services/auction-category-services/AuctionCardServices";
import { DeleteAuctionCategoryService } from "../src/services/auction-category-services/AuctionCategoryServices";
import { UpdateCardsService, DeleteCardsService } from "../src/services/card-services/CardsServices";
import { BindCardToUserService } from "../src/services/client/card-services/CardServices";
import { CardTopUpTransactionService, CardRefundTransactionService } from "../src/services/card-transactions-services/CardTransactionsServices";
import { PaymentType } from "../src/models/postgresql/card-transactions-model/enums";
import { UserStatusTypes } from "../src/models/postgresql/client/user-model/enums";
import { AssertCardOutsideAuction } from "../src/utils/cardAuction";
import { CardDTO } from "../src/dtos/card-dtos/CardDto";
import { UserCardDTO } from "../src/dtos/client/card-dtos/CardDto";

const transaction = { LOCK: { UPDATE: "UPDATE" }, commit: async () => {}, rollback: async () => {} };
const mockTransaction = (t: TestContext) => t.mock.method(
  sequelize, "transaction", async (callback?: any) => callback ? callback(transaction) : transaction,
);

const card = (values: Record<string, unknown> = {}) => CardModel.build({
  id: 1, card: "000123", nfc: "NFC-1", batch: 1, user: null,
  status: CardStatusTypes.INACTIVE, type: CardType.CLASSIC, balance: 0,
  imported_at: new Date(), activated_at: null, ...values,
} as any);
const category = (values: Record<string, unknown> = {}) => AuctionCategoryModel.build({
  id: 1, name: "Premium", price: 300000, is_active: true, ...values,
} as any);
const invalid = (code: string) => (error: any) => {
  assert.ok(error instanceof AppError);
  assert.equal(error.message, code);
  return true;
};

const setEnv = (t: TestContext, key: string, value: string) => {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
};

test("director and superadmin can assign and remove batches through the HTTP API, preserving card numbers", async (t) => {
  setEnv(t, "JWT_SECRET", "auction-cards-test-secret");
  let role = "director";
  t.mock.method(EmployeeModel, "findOne", async () => ({ id: 1, role: 1 }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ name: role }) as any);
  const headers = { authorization: `Bearer ${jwt.sign({ employee_id: 1 }, process.env.JWT_SECRET!)}` };
  mockTransaction(t);
  t.mock.method(AuctionCategoryModel, "findByPk", async (id: any, options: any) => {
    assert.equal(Number(id), 1);
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return category();
  });
  let cards = [card(), card({ id: 2, card: "000456", nfc: "NFC-2" })];
  let updates = 0;
  for (const value of cards) {
    t.mock.method(value, "update", async (data: any, options: any) => {
      assert.equal(options.transaction, transaction);
      updates += 1;
      value.set(data);
      return value;
    });
  }
  t.mock.method(CardModel, "findAll", async (options: any) => {
    assert.deepEqual(options.where.card[Op.in], ["000123", "000456"]);
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    assert.deepEqual(options.order, [["id", "ASC"]]);
    return cards;
  });
  const app = Fastify();
  app.register(AuctionCategoryRouter, { prefix: "/api/v1" });
  t.after(() => app.close());
  const payload = { data: { auctionCategoryID: 1, cards: [" 000123 ", "000456"] } };
  for (const allowedRole of ["director", "superadmin"]) {
    role = allowedRole;
    const added = await app.inject({ method: "POST", url: "/api/v1/auction-categories/cards", headers, payload });
    assert.equal(added.statusCode, 200, added.body);
    assert.deepEqual(added.json().data.cards.map((value: any) => value.card), ["000123", "000456"]);
    for (const value of added.json().data.cards) {
      assert.equal(value.status, "inactive");
      assert.equal(value.auction_status, "listed");
      assert.equal(value.auction_category_id, 1);
      assert.equal(value.is_auction, true);
      assert.equal(value.type, "classic");
      assert.equal(value.nfc, undefined);
      assert.equal(value.bind_token, undefined);
    }
    const removed = await app.inject({ method: "DELETE", url: "/api/v1/auction-categories/cards", headers, payload });
    assert.equal(removed.statusCode, 200, removed.body);
    for (const value of removed.json().data.cards) {
      assert.equal(value.auction_category_id, null);
      assert.equal(value.auction_status, null);
      assert.equal(value.is_auction, false);
    }
  }
  assert.equal(updates, 8);
});

test("invalid assignment reports every offending card and writes none of the batch", async (t) => {
  mockTransaction(t);
  t.mock.method(AuctionCategoryModel, "findByPk", async () => category());
  const cards = [
    card(),
    card({ id: 2, card: "000456", status: CardStatusTypes.ACTIVE, user: 7 }),
    card({ id: 3, card: "000789", auction_category_id: 2, auction_status: AuctionCardStatus.LISTED }),
  ];
  let writes = 0;
  for (const value of cards) t.mock.method(value, "update", async () => { writes += 1; });
  t.mock.method(CardModel, "findAll", async () => cards);
  await assert.rejects(AssignAuctionCardsService({
    auctionCategoryID: 1, cards: ["000123", "000456", "000789", "missing"],
  }), (error: any) => {
    assert.equal(error.statusCode, 400);
    assert.deepEqual(error.errors, [
      { card: "000456", code: "CARD_NOT_INACTIVE" },
      { card: "000456", code: "CARD_ALREADY_BOUND" },
      { card: "000789", code: "CARD_ALREADY_IN_AUCTION" },
      { card: "missing", code: "CARD_NOT_FOUND" },
    ]);
    return true;
  });
  assert.equal(writes, 0);
  assert.equal(cards[0].auction_category_id, null);
});

test("invalid and duplicate card numbers are rejected before opening a transaction", async (t) => {
  t.mock.method(sequelize, "transaction", async () => { throw new Error("Unexpected transaction"); });
  for (const cards of [[], Array(501).fill("1"), [123], [" "], ["a".repeat(256)]]) {
    await assert.rejects(AssignAuctionCardsService({ auctionCategoryID: 1, cards } as any), (error: any) => {
      assert.equal(error.statusCode, 400);
      return true;
    });
  }
  await assert.rejects(AssignAuctionCardsService({ auctionCategoryID: 1, cards: ["000123", " 000123 "] }), (error: any) => {
    assert.equal(error.errors[0].code, "DUPLICATE_CARD_NUMBER");
    assert.equal(error.errors[0].card, "000123");
    return true;
  });
});

test("missing and inactive categories reject assignment before querying cards", async (t) => {
  mockTransaction(t);
  let result: any = null;
  t.mock.method(AuctionCategoryModel, "findByPk", async () => result);
  t.mock.method(CardModel, "findAll", async () => { throw new Error("Unexpected cards query"); });
  const body = { auctionCategoryID: 1, cards: ["000123"] };
  await assert.rejects(AssignAuctionCardsService(body), (error: any) => error.statusCode === 404);
  result = category({ is_active: false });
  await assert.rejects(AssignAuctionCardsService(body), invalid("AUCTION_CATEGORY_IS_INACTIVE"));
});

test("reserved, sold, unbound-to-category and differently assigned cards cannot be detached", async (t) => {
  mockTransaction(t);
  // Removal is permitted even when a category has been disabled.
  t.mock.method(AuctionCategoryModel, "findByPk", async () => category({ is_active: false }));
  let current: CardModel;
  t.mock.method(CardModel, "findAll", async () => [current]);
  for (const values of [
    { auction_category_id: 1, auction_status: AuctionCardStatus.RESERVED },
    { auction_category_id: 1, auction_status: AuctionCardStatus.SOLD },
    { auction_category_id: 2, auction_status: AuctionCardStatus.LISTED },
    { auction_category_id: null, auction_status: null },
  ]) {
    current = card(values);
    t.mock.method(current, "update", async () => { throw new Error("Unexpected write"); });
    await assert.rejects(RemoveAuctionCardsService({ auctionCategoryID: 1, cards: ["000123"] }), invalid("AUCTION_CARDS_VALIDATION_FAILED"));
  }
});

test("a category with cards cannot be deleted", async (t) => {
  mockTransaction(t);
  t.mock.method(AuctionCategoryModel, "findByPk", async () => category());
  t.mock.method(CardModel, "findOne", async () => card({ auction_category_id: 1 }));
  await assert.rejects(DeleteAuctionCategoryService({ categoryID: 1 }), invalid("AUCTION_CATEGORY_HAS_CARDS"));
});

test("dashboard listings filter auction status, search and pagination", async (t) => {
  t.mock.method(AuctionCategoryModel, "findByPk", async () => category());
  t.mock.method(CardModel, "findAndCountAll", async (options: any) => {
    assert.equal(Number(options.where.auction_category_id), 1);
    assert.equal(options.where.auction_status, "sold");
    assert.equal(options.where.card[Op.iLike], "%000%");
    assert.equal(options.limit, 5);
    assert.equal(options.offset, 5);
    return { rows: [], count: 12 } as any;
  });
  const result = await GetAuctionCategoryCardsService({ categoryID: 1 }, { auction_status: AuctionCardStatus.SOLD, search: "000", page: 2, limit: 5 });
  assert.deepEqual(result.pagination, { total: 12, page: 2, limit: 5, totalPages: 3 });
});

test("client listings require Telegram auth and expose only available cards without NFC or bind tokens", async (t) => {
  setEnv(t, "TELEGRAM_BOT_TOKEN", "auction-cards-bot-test-token");
  let active = true;
  t.mock.method(AuctionCategoryModel, "findByPk", async () => category({ is_active: active }));
  t.mock.method(CardModel, "findAndCountAll", async (options: any) => {
    assert.equal(options.where.auction_status, "listed");
    assert.equal(options.where.status, "inactive");
    assert.equal(options.where.user, null);
    assert.notEqual(options.paranoid, false);
    return { rows: [card({ auction_category_id: 1, auction_status: AuctionCardStatus.LISTED })], count: 1 } as any;
  });
  const app = Fastify();
  app.register(ClientAuctionCategoryRouter, { prefix: "/api/v1/client" });
  t.after(() => app.close());
  const url = "/api/v1/client/auction-categories/1/cards";
  assert.equal((await app.inject({ method: "GET", url })).statusCode, 401);
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 7, first_name: "Test" }) });
  const check = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN!).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  const headers = { "x-telegram-init-data": params.toString() };
  const result = await app.inject({ method: "GET", url, headers });
  assert.equal(result.statusCode, 200, result.body);
  const value = result.json().data.cards[0];
  assert.equal(value.card, "000123");
  assert.equal(value.is_auction, true);
  assert.equal(value.nfc, undefined);
  assert.equal(value.bind_token_hash, undefined);
  assert.equal(value.bind_token, undefined);
  active = false;
  assert.equal((await app.inject({ method: "GET", url, headers })).statusCode, 404);
});

test("listed and reserved cards cannot be manually activated, bound, topped up or used as replacements", async (t) => {
  mockTransaction(t);
  t.mock.method(UserModel, "findOne", async () => ({ id: 7, status: UserStatusTypes.ACTIVE, phone_verified_at: new Date(), registered_at: new Date() }) as any);
  t.mock.method(CashboxReportModel, "findOne", async () => ({ id: 1, zreport: 2, cashbox: 1 }) as any);
  let current: CardModel;
  t.mock.method(CardModel, "findByPk", async () => current);
  t.mock.method(CardModel, "findOne", async () => current);
  t.mock.method(CardModel, "findAll", async () => [card({ card: "old", status: CardStatusTypes.ACTIVE }), current]);
  t.mock.method(CardTransactionModel, "create", async () => { throw new Error("Unexpected transaction write"); });
  for (const auction_status of [AuctionCardStatus.LISTED, AuctionCardStatus.RESERVED]) {
    current = card({ auction_category_id: 1, auction_status });
    await assert.rejects(UpdateCardsService({ cardID: 1 }, { status: CardStatusTypes.ACTIVE } as any, "superadmin"), invalid("CARD_RESERVED_FOR_AUCTION"));
    await assert.rejects(BindCardToUserService(123, { card_number: current.card, bind_token: "A1B2C" }), invalid("CARD_RESERVED_FOR_AUCTION"));
    await assert.rejects(CardTopUpTransactionService(1, { type: "card", id: current.card, amount: 10000, payment_type: PaymentType.CASH } as any), invalid("CARD_RESERVED_FOR_AUCTION"));
    await assert.rejects(CardRefundTransactionService(1, { old_card: "old", new_card: current.card, amount: 0 } as any), invalid("CARD_RESERVED_FOR_AUCTION"));
  }
  assert.doesNotThrow(() => AssertCardOutsideAuction(card()));
  assert.doesNotThrow(() => AssertCardOutsideAuction(card({ auction_category_id: 1, auction_status: AuctionCardStatus.SOLD })));
});

test("cards with auction history cannot be hard deleted", async (t) => {
  mockTransaction(t);
  t.mock.method(CardModel, "findAll", async () => [card({ auction_category_id: 1, auction_status: AuctionCardStatus.SOLD })]);
  t.mock.method(CardModel, "destroy", async () => { throw new Error("Unexpected hard deletion"); });
  await assert.rejects(DeleteCardsService({ cardIDs: [1] }, "superadmin"), invalid("CARD_HAS_AUCTION_HISTORY"));
});

test("sold cards retain auction provenance in dashboard and client DTOs", () => {
  const sold = card({ auction_category_id: "1", auction_status: AuctionCardStatus.SOLD, status: CardStatusTypes.ACTIVE, user: 7 });
  for (const result of [CardDTO(sold as any), UserCardDTO(sold as any)]) {
    assert.equal(result.is_auction, true);
    assert.equal(result.auction_category_id, 1);
    assert.equal(result.auction_status, "sold");
    assert.equal(result.type, "classic");
  }
});

test("ordinary card listing serializes auction metadata and supports auction filters", async (t) => {
  setEnv(t, "JWT_SECRET", "auction-cards-list-test-secret");
  t.mock.method(EmployeeModel, "findOne", async () => ({ id: 1, role: 1 }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ name: "director" }) as any);
  t.mock.method(CardModel, "findAndCountAll", async (options: any) => {
    assert.equal(options.where.auction_category_id, 1);
    assert.equal(options.where.auction_status, "listed");
    return { rows: [card({ auction_category_id: 1, auction_status: AuctionCardStatus.LISTED })], count: 1 } as any;
  });
  t.mock.method(CardTransactionModel, "findAll", async () => []);
  const app = Fastify();
  app.register(CardsRouter, { prefix: "/api/v1" });
  t.after(() => app.close());
  const response = await app.inject({ method: "GET", url: "/api/v1/cards?is_auction=true&auction_category_id=1&auction_status=listed", headers: { authorization: `Bearer ${jwt.sign({ employee_id: 1 }, process.env.JWT_SECRET!)}` } });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().data.cards[0].is_auction, true);
  assert.equal(response.json().data.cards[0].auction_status, "listed");
});
