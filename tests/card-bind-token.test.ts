import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { CardDTO } from "../src/dtos/card-dtos/CardDto";
import {
  CardStatusTypes,
  CardType,
} from "../src/models/postgresql/cards-model/enums";
import {
  CompareCardBindToken,
  DecryptCardBindToken,
  EncryptCardBindToken,
  HashCardBindToken,
} from "../src/utils/client/CardBindTokenHelper";

const WithCardBindTokenSecret = (t: TestContext) => {
  const previousSecret = process.env.CARD_BIND_TOKEN_SECRET;
  process.env.CARD_BIND_TOKEN_SECRET = "card-bind-token-test-secret";
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.CARD_BIND_TOKEN_SECRET;
    } else {
      process.env.CARD_BIND_TOKEN_SECRET = previousSecret;
    }
  });
};

test("card bind token encryption is reversible and deterministic", (t) => {
  WithCardBindTokenSecret(t);

  const firstEncryptedToken = EncryptCardBindToken("A1B2C");
  const secondEncryptedToken = EncryptCardBindToken("A1B2C");

  assert.equal(firstEncryptedToken, secondEncryptedToken);
  assert.ok(firstEncryptedToken.length <= 64);
  assert.equal(DecryptCardBindToken(firstEncryptedToken), "A1B2C");
  assert.equal(CompareCardBindToken("A1B2C", firstEncryptedToken), true);
  assert.equal(CompareCardBindToken("Z9Y8X", firstEncryptedToken), false);
});

test("legacy card bind token hashes remain valid for binding", (t) => {
  WithCardBindTokenSecret(t);

  const legacyHash = HashCardBindToken("A1B2C");

  assert.equal(DecryptCardBindToken(legacyHash), null);
  assert.equal(CompareCardBindToken("A1B2C", legacyHash), true);
  assert.equal(CompareCardBindToken("Z9Y8X", legacyHash), false);
});

test("tampered encrypted card bind tokens cannot be opened", (t) => {
  WithCardBindTokenSecret(t);

  const encryptedToken = EncryptCardBindToken("A1B2C");
  const lastCharacter = encryptedToken.at(-1);
  const tamperedToken = `${encryptedToken.slice(0, -1)}${
    lastCharacter === "A" ? "B" : "A"
  }`;

  assert.equal(DecryptCardBindToken(tamperedToken), null);
  assert.equal(CompareCardBindToken("A1B2C", tamperedToken), false);
});

test("card response returns a decrypted bind token", (t) => {
  WithCardBindTokenSecret(t);

  const card = CardDTO(
    {
      id: 1,
      user: null,
      batch: 2,
      card: "CARD-1",
      nfc: "NFC-1",
      bind_token_hash: EncryptCardBindToken("A1B2C"),
      status: CardStatusTypes.ACTIVE,
      type: CardType.CLASSIC,
      balance: 0,
      imported_at: new Date(),
      activated_at: new Date(),
      bound_at: new Date(),
      returned_at: null,
      return_description: null,
    },
    { includeBindToken: true },
  );

  assert.equal(card.bind_token, "A1B2C");
});
