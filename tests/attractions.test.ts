import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AttractionModel,
  AttractionOperatorModel,
} from "../src/plugins/db/postgresql/db";
import { GetAttractionsService } from "../src/services/attraction-services/AttractionsServices";

test("attractions are queried by name in case-insensitive A-Z order", async (t) => {
  let findOptions: any;

  t.mock.method(
    AttractionModel,
    "findAndCountAll",
    async (options: any) => {
      findOptions = options;
      return { rows: [], count: 0 } as any;
    },
  );
  t.mock.method(AttractionOperatorModel, "findAll", async () => [] as any);

  await GetAttractionsService({} as GetAttractionsQuery);

  const [lowerNameOrder, nameOrder, idOrder] = findOptions.order;

  assert.equal(lowerNameOrder[0].fn, "LOWER");
  assert.equal(lowerNameOrder[0].args[0].col, "name");
  assert.equal(lowerNameOrder[1], "ASC");
  assert.deepEqual(nameOrder, ["name", "ASC"]);
  assert.deepEqual(idOrder, ["id", "ASC"]);
});
