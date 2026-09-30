import assert from "node:assert/strict";
import { test } from "node:test";
import { RoleTypes } from "../src/models/postgresql/role-model/enums";
import { EmployeeModel, RoleModel, sequelize } from "../src/plugins/db/postgresql/db";
import { CreateEmployeesService } from "../src/services/employee-services/EmployeesServices";
import { GetRolesService } from "../src/services/roles-services/RolesServices";

test("owner role remains available until two owners exist", async (t) => {
  t.mock.method(RoleModel, "findAll", async () =>
    [
      { id: 1, name: RoleTypes.OWNER },
      { id: 2, name: RoleTypes.ADMIN },
    ] as any,
  );

  let ownerCount = 0;
  t.mock.method(EmployeeModel, "count", async () => ownerCount);

  assert.deepEqual(
    (await GetRolesService()).map((role) => role.name),
    [RoleTypes.OWNER, RoleTypes.ADMIN],
  );

  ownerCount = 1;
  assert.deepEqual(
    (await GetRolesService()).map((role) => role.name),
    [RoleTypes.OWNER, RoleTypes.ADMIN],
  );

  ownerCount = 2;
  assert.deepEqual((await GetRolesService()).map((role) => role.name), [
    RoleTypes.ADMIN,
  ]);
});

test("third owner creation is rejected", async (t) => {
  t.mock.method(RoleModel, "findOne", async () =>
    ({ id: 1, name: RoleTypes.OWNER }) as any,
  );
  t.mock.method(EmployeeModel, "count", async () => 2);
  t.mock.method(sequelize, "query", async () => [] as any);
  t.mock.method(sequelize, "transaction", async (callback: any) =>
    callback({}),
  );

  await assert.rejects(
    CreateEmployeesService({ role: 1 } as any),
    (error: any) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.message, "Maximum number of owner employees reached");
      return true;
    },
  );
});
