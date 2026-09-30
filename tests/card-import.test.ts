import assert from "node:assert/strict";
import { test } from "node:test";
import XLSX from "xlsx";
import { AppError } from "../src/exceptions";
import { CardType } from "../src/models/postgresql/cards-model/enums";
import {
  CardBatchModel,
  CardModel,
  sequelize,
} from "../src/plugins/db/postgresql/db";
import {
  CreateCardsService,
  FindExistingCardImportErrors,
} from "../src/services/card-services/CardsServices";
import {
  ParseCardExcel,
  NormalizeCardNfcID,
  ValidateCardExcel,
} from "../src/utils/excelHelpers";

const CreateCardExcel = (
  rows: Array<{ card_id: string; nfc_id: string; bind_token: string }>,
) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cards");

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
};

test("card Excel validation reports every duplicate with its row", () => {
  const validation = ValidateCardExcel([
    { card_id: "CARD-1", nfc_id: "NFC-1", bind_token: "A1B2C" },
    { card_id: "CARD-2", nfc_id: "NFC-2", bind_token: "D3E4F" },
    { card_id: " CARD-1 ", nfc_id: "NFC-3", bind_token: "G5H6I" },
    { card_id: "CARD-4", nfc_id: " NFC-2 ", bind_token: "J7K8L" },
    { card_id: "CARD-5", nfc_id: "NFC-5", bind_token: "A1B2C" },
  ]);

  assert.deepEqual(validation.errors, [
    {
      code: "DUPLICATE_CARD_ID_IN_FILE",
      field: "card_id",
      row: 4,
      card_id: "CARD-1",
      duplicate_of_row: 2,
    },
    {
      code: "DUPLICATE_NFC_ID_IN_FILE",
      field: "nfc_id",
      row: 5,
      nfc_id: "NFC-2",
      duplicate_of_row: 3,
    },
    {
      code: "DUPLICATE_BIND_TOKEN_IN_FILE",
      field: "bind_token",
      row: 6,
      duplicate_of_row: 2,
    },
  ]);
});

test("card Excel validation preserves real row numbers across blank rows", () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["card_id", "nfc_id", "bind_token"],
    ["CARD-1", "NFC-1", "A1B2C"],
    [],
    ["CARD-1", "NFC-2", "D3E4F"],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cards");
  const file = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  const validation = ValidateCardExcel(ParseCardExcel(file));

  assert.deepEqual(validation.errors, [
    {
      code: "DUPLICATE_CARD_ID_IN_FILE",
      field: "card_id",
      row: 4,
      card_id: "CARD-1",
      duplicate_of_row: 2,
    },
  ]);
});

test("card NFC IDs are stored without the first leading zero", () => {
  assert.equal(NormalizeCardNfcID(" 0012345 "), "012345");

  const validation = ValidateCardExcel([
    { card_id: "CARD-1", nfc_id: "012345", bind_token: "A1B2C" },
    { card_id: "CARD-2", nfc_id: "12345", bind_token: "D3E4F" },
  ]);

  assert.equal(validation.rows[0].nfc_id, "12345");
  assert.deepEqual(validation.errors, [
    {
      code: "DUPLICATE_NFC_ID_IN_FILE",
      field: "nfc_id",
      row: 3,
      nfc_id: "12345",
      duplicate_of_row: 2,
    },
  ]);
});

test("existing card values are reported with Excel rows", async (t) => {
  let findOptions: any;

  t.mock.method(CardModel, "findAll", async (options: any) => {
    findOptions = options;

    return [
      {
        id: 41,
        card: "CARD-1",
        nfc: "OTHER-NFC",
        bind_token_hash: null,
      },
      {
        id: 42,
        card: "OTHER-CARD",
        nfc: "0NFC-2",
        bind_token_hash: "existing-hash",
      },
    ] as any;
  });

  const errors = await FindExistingCardImportErrors([
    {
      row_number: 2,
      card_id: "CARD-1",
      nfc_id: "NFC-1",
      bind_token: "A1B2C",
      bind_token_hash: "new-hash",
    },
    {
      row_number: 3,
      card_id: "CARD-2",
      nfc_id: "NFC-2",
      bind_token: "D3E4F",
      bind_token_hash: "existing-hash",
    },
  ]);

  assert.equal(findOptions.paranoid, false);
  assert.deepEqual(errors, [
    {
      code: "CARD_ID_ALREADY_EXISTS",
      field: "card_id",
      row: 2,
      card_id: "CARD-1",
      existing_record_id: 41,
    },
    {
      code: "BIND_TOKEN_ALREADY_EXISTS",
      field: "bind_token",
      row: 3,
      existing_record_id: 42,
    },
    {
      code: "NFC_ID_ALREADY_EXISTS",
      field: "nfc_id",
      row: 3,
      nfc_id: "NFC-2",
      existing_record_id: 42,
    },
  ]);
});

test("database conflicts stop card import before creating a batch", async (t) => {
  const previousSecret = process.env.CARD_BIND_TOKEN_SECRET;
  process.env.CARD_BIND_TOKEN_SECRET = "card-import-test-secret";
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.CARD_BIND_TOKEN_SECRET;
    } else {
      process.env.CARD_BIND_TOKEN_SECRET = previousSecret;
    }
  });

  t.mock.method(CardModel, "findAll", async () =>
    [
      {
        id: 77,
        card: "CARD-EXISTS",
        nfc: "OTHER-NFC",
        bind_token_hash: null,
      },
    ] as any,
  );

  let transactionCalls = 0;
  t.mock.method(sequelize, "transaction", async () => {
    transactionCalls += 1;
    throw new Error("Transaction must not start for an invalid import");
  });

  const file = CreateCardExcel([
    {
      card_id: "CARD-EXISTS",
      nfc_id: "NFC-NEW",
      bind_token: "A1B2C",
    },
  ]);

  await assert.rejects(
    () =>
      CreateCardsService(1, "superadmin", {
        file,
        batch_name: "Test batch",
        type: CardType.CLASSIC,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "CARD_IMPORT_VALIDATION_FAILED");
      assert.deepEqual(error.errors, [
        {
          code: "CARD_ID_ALREADY_EXISTS",
          field: "card_id",
          row: 2,
          card_id: "CARD-EXISTS",
          existing_record_id: 77,
        },
      ]);
      return true;
    },
  );

  assert.equal(transactionCalls, 0);
});

test("card import persists a normalized NFC ID", async (t) => {
  const previousSecret = process.env.CARD_BIND_TOKEN_SECRET;
  process.env.CARD_BIND_TOKEN_SECRET = "card-import-test-secret";
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.CARD_BIND_TOKEN_SECRET;
    } else {
      process.env.CARD_BIND_TOKEN_SECRET = previousSecret;
    }
  });

  t.mock.method(CardModel, "findAll", async () => []);
  t.mock.method(sequelize, "transaction", async (callback: any) =>
    callback({}),
  );
  t.mock.method(CardBatchModel, "create", async () =>
    ({ id: 1, name: "Normalized NFC batch" }) as any,
  );

  let insertedCards: any[] = [];
  t.mock.method(CardModel, "bulkCreate", async (cards: any[]) => {
    insertedCards = cards;
    return [] as any;
  });

  await CreateCardsService(1, "superadmin", {
    file: CreateCardExcel([
      {
        card_id: "CARD-NORMALIZED",
        nfc_id: "012345",
        bind_token: "A1B2C",
      },
    ]),
    batch_name: "Normalized NFC batch",
    type: CardType.CLASSIC,
  });

  assert.equal(insertedCards.length, 1);
  assert.equal(insertedCards[0].nfc, "12345");
});
