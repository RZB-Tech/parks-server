import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CardModel,
  sequelize,
} from "../src/plugins/db/postgresql/db";
import { GetCardsService } from "../src/services/card-services/CardsServices";

test("cards are ordered by numeric card number with stable fallbacks", async (t) => {
  let findOptions: any;

  t.mock.method(CardModel, "findAndCountAll", async (options: any) => {
    findOptions = options;
    return { rows: [], count: 0 } as any;
  });

  await GetCardsService({ page: 1, limit: 10 } as GetCardsQuery);

  const sql = sequelize.dialect.queryGenerator.selectQuery("cards", {
    attributes: ["id", "card"],
    order: findOptions.order,
  });

  assert.match(
    sql,
    /CASE WHEN "card" ~ '\^\[0-9\]\+\$' THEN 0 ELSE 1 END ASC/,
  );
  assert.match(
    sql,
    /CASE WHEN "card" ~ '\^\[0-9\]\+\$' THEN "card"::NUMERIC END ASC/,
  );
  assert.match(sql, /"card" ASC, "id" ASC/);
});
