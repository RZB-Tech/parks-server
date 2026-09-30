import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/exceptions";
import {
  CardStatusTypes,
  CardType,
} from "../src/models/postgresql/cards-model/enums";
import { UserStatusTypes } from "../src/models/postgresql/client/user-model/enums";
import {
  CardBatchModel,
  CardModel,
  UserModel,
} from "../src/plugins/db/postgresql/db";
import { BindCardToUserService } from "../src/services/client/card-services/CardServices";
import {
  DecryptCardBindToken,
  EncryptCardBindToken,
} from "../src/utils/client/CardBindTokenHelper";

const transaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
} as any;

test("an unassigned active card can be bound without changing active count", async (t) => {
  const previousSecret = process.env.CARD_BIND_TOKEN_SECRET;
  process.env.CARD_BIND_TOKEN_SECRET = "client-card-bind-test-secret";
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.CARD_BIND_TOKEN_SECRET;
    } else {
      process.env.CARD_BIND_TOKEN_SECRET = previousSecret;
    }
  });

  const card = {
    id: 10,
    user: null,
    batch: 20,
    card: "CARD-10",
    nfc: "NFC-10",
    status: CardStatusTypes.ACTIVE,
    type: CardType.CLASSIC,
    balance: 0,
    activated_at: new Date("2026-09-30T00:00:00.000Z"),
    bind_token_hash: EncryptCardBindToken("A1B2C"),
    update: async (values: Record<string, unknown>) => {
      Object.assign(card, values);
    },
  } as any;

  const incrementCalls: unknown[] = [];
  const decrementCalls: unknown[] = [];
  const batch = {
    increment: async (fields: unknown) => {
      incrementCalls.push(fields);
    },
    decrement: async (fields: unknown) => {
      decrementCalls.push(fields);
    },
  } as any;

  t.mock.method(
    CardModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(UserModel, "findOne", async () =>
    ({
      id: 7,
      status: UserStatusTypes.ACTIVE,
      phone_verified_at: new Date(),
      registered_at: new Date(),
    }) as any,
  );
  t.mock.method(CardModel, "findOne", async () => card);
  t.mock.method(CardBatchModel, "findByPk", async () => batch);

  const result = await BindCardToUserService(123, {
    card_number: "CARD-10",
    bind_token: "A1B2C",
  });

  assert.equal(result.status, CardStatusTypes.ACTIVE);
  assert.equal(card.user, 7);
  assert.equal(DecryptCardBindToken(card.bind_token_hash), "A1B2C");
  assert.deepEqual(decrementCalls, []);
  assert.deepEqual(incrementCalls, ["tethered_cards"]);
});

test("an inactive classic card cannot be bound", async (t) => {
  const previousSecret = process.env.CARD_BIND_TOKEN_SECRET;
  process.env.CARD_BIND_TOKEN_SECRET = "client-card-bind-test-secret";
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.CARD_BIND_TOKEN_SECRET;
    } else {
      process.env.CARD_BIND_TOKEN_SECRET = previousSecret;
    }
  });

  const card = {
    id: 11,
    user: null,
    batch: 20,
    card: "CARD-11",
    nfc: "NFC-11",
    status: CardStatusTypes.INACTIVE,
    type: CardType.CLASSIC,
    balance: 0,
    activated_at: null,
    bind_token_hash: EncryptCardBindToken("A1B2C"),
  } as any;

  t.mock.method(
    CardModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(UserModel, "findOne", async () =>
    ({
      id: 7,
      status: UserStatusTypes.ACTIVE,
      phone_verified_at: new Date(),
      registered_at: new Date(),
    }) as any,
  );
  t.mock.method(CardModel, "findOne", async () => card);

  await assert.rejects(
    () =>
      BindCardToUserService(123, {
        card_number: "CARD-11",
        bind_token: "A1B2C",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "CARD_STATUS_IS_NOT_BINDABLE");
      return true;
    },
  );
});
