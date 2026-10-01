import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import bcrypt from "bcrypt";
import { EmployeeDTO } from "../src/dtos/employees-dtos/EmployeeDto";
import { AppError } from "../src/exceptions";
import { EmployeeStatusTypes } from "../src/models/postgresql/employees-model/enums";
import {
  EmployeeModel,
  RoleModel,
  sequelize,
} from "../src/plugins/db/postgresql/db";
import { sanitizeRecord } from "../src/plugins/db/postgresql/auditHooks";
import { LoginService } from "../src/services/auth-services/AuthServices";
import {
  CreateEmployeesService,
  UpdateEmployeesService,
} from "../src/services/employee-services/EmployeesServices";
import {
  HashEmployeeNfc,
  NormalizeEmployeeNfc,
} from "../src/utils/employeeNfc";
import {
  AssertEmployeeLoginAllowed,
  ClearEmployeeLoginFailures,
  RegisterEmployeeLoginFailure,
} from "../src/utils/employeeLoginRateLimit";

const WithAuthSecrets = (t: TestContext) => {
  const previousNfcSecret = process.env.EMPLOYEE_NFC_SECRET;
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.EMPLOYEE_NFC_SECRET = "employee-nfc-test-secret";
  process.env.JWT_SECRET = "employee-jwt-test-secret";

  t.after(() => {
    if (previousNfcSecret === undefined) {
      delete process.env.EMPLOYEE_NFC_SECRET;
    } else {
      process.env.EMPLOYEE_NFC_SECRET = previousNfcSecret;
    }

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });
};

const ActiveEmployee = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 7,
    firstname: "Test",
    lastname: "Employee",
    date_of_birth: new Date("2000-01-01"),
    phone_number: "+998901234567",
    telegram_username: "test_employee",
    role: 2,
    status: EmployeeStatusTypes.ACTIVE,
    salary: null,
    file: null,
    password: "password-hash",
    nfc_hash: null,
    ...overrides,
  }) as any;

test("employee NFC hashing is normalized and deterministic", (t) => {
  WithAuthSecrets(t);

  assert.equal(NormalizeEmployeeNfc("  NFC-123  "), "NFC-123");
  assert.equal(HashEmployeeNfc(" NFC-123 "), HashEmployeeNfc("NFC-123"));
  assert.notEqual(HashEmployeeNfc("NFC-123"), "NFC-123");
});

test("employee DTO exposes only whether NFC is configured", () => {
  const result = EmployeeDTO(
    ActiveEmployee({ nfc_hash: "stored-hash" }) as any,
  );

  assert.equal(result.has_nfc, true);
  assert.equal("nfc_hash" in result, false);
  assert.equal("password" in result, false);
});

test("employee can log in using only NFC", async (t) => {
  WithAuthSecrets(t);
  let findOptions: any;

  t.mock.method(EmployeeModel, "findOne", async (options: any) => {
    findOptions = options;
    return ActiveEmployee();
  });

  const result = await LoginService({ nfc: " NFC-123 " });

  assert.equal(
    findOptions.where.nfc_hash,
    HashEmployeeNfc("NFC-123"),
  );
  assert.ok(result.jwtToken);
  assert.ok(result.fingerprint);
});

test("inactive employee cannot log in using NFC", async (t) => {
  WithAuthSecrets(t);
  t.mock.method(EmployeeModel, "findOne", async () =>
    ActiveEmployee({ status: EmployeeStatusTypes.INACTIVE }),
  );

  await assert.rejects(
    () => LoginService({ nfc: "NFC-123" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, "INVALID_CREDENTIALS");
      return true;
    },
  );
});

test("phone and password login remains available", async (t) => {
  WithAuthSecrets(t);
  const passwordHash = await bcrypt.hash("secret123", 4);
  t.mock.method(EmployeeModel, "findOne", async () =>
    ActiveEmployee({ password: passwordHash }),
  );

  const result = await LoginService({
    phone_number: "+998901234567",
    password: "secret123",
  });

  assert.ok(result.jwtToken);
});

test("employee creation stores an NFC hash instead of raw NFC", async (t) => {
  WithAuthSecrets(t);
  let createdValues: any;

  t.mock.method(sequelize, "transaction", async (callback: any) =>
    callback({}),
  );
  t.mock.method(RoleModel, "findOne", async () =>
    ({ id: 2, name: "admin" }) as any,
  );
  t.mock.method(EmployeeModel, "findOne", async () => null);
  t.mock.method(EmployeeModel, "create", async (values: any) => {
    createdValues = values;
    return {
      get: () => ({ id: 10, ...values }),
    } as any;
  });

  const result = await CreateEmployeesService({
    firstname: "Test",
    lastname: "Employee",
    date_of_birth: new Date("2000-01-01"),
    phone_number: "+998901234567",
    telegram_username: "test_employee",
    role: 2,
    salary: null,
    file: null,
    password: "secret123",
    nfc: " NFC-123 ",
  });

  assert.equal(createdValues.nfc_hash, HashEmployeeNfc("NFC-123"));
  assert.equal(createdValues.nfc_hash.includes("NFC-123"), false);
  assert.equal(result.has_nfc, true);
});

test("employee NFC can be replaced and removed without its old value", async (t) => {
  WithAuthSecrets(t);
  const employee = ActiveEmployee({ nfc_hash: "old-hash" });
  employee.update = async (values: Record<string, unknown>) => {
    Object.assign(employee, values);
  };
  employee.get = () => ({ ...employee });

  t.mock.method(EmployeeModel, "findByPk", async () => employee);
  t.mock.method(RoleModel, "findOne", async () => null);
  t.mock.method(EmployeeModel, "findOne", async () => null);

  const replaced = await UpdateEmployeesService(
    { employeeID: 7 },
    { nfc: "NFC-NEW" },
  );
  assert.equal(employee.nfc_hash, HashEmployeeNfc("NFC-NEW"));
  assert.equal(replaced.has_nfc, true);

  await UpdateEmployeesService(
    { employeeID: 7 },
    { firstname: "Renamed" },
  );
  assert.equal(employee.nfc_hash, HashEmployeeNfc("NFC-NEW"));

  const removed = await UpdateEmployeesService(
    { employeeID: 7 },
    { nfc: null },
  );
  assert.equal(employee.nfc_hash, null);
  assert.equal(removed.has_nfc, false);
});

test("duplicate employee NFC is rejected", async (t) => {
  WithAuthSecrets(t);
  let employeeLookup = 0;

  t.mock.method(sequelize, "transaction", async (callback: any) =>
    callback({}),
  );
  t.mock.method(RoleModel, "findOne", async () =>
    ({ id: 2, name: "admin" }) as any,
  );
  t.mock.method(EmployeeModel, "findOne", async () => {
    employeeLookup += 1;
    return employeeLookup === 1 ? null : ActiveEmployee();
  });

  await assert.rejects(
    () =>
      CreateEmployeesService({
        firstname: "Test",
        lastname: "Employee",
        date_of_birth: new Date("2000-01-01"),
        phone_number: "+998901234567",
        telegram_username: "test_employee",
        role: 2,
        salary: null,
        file: null,
        password: "secret123",
        nfc: "NFC-123",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.message, "EMPLOYEE_NFC_ALREADY_EXISTS");
      return true;
    },
  );
});

test("employee NFC values are redacted from audit data", () => {
  assert.deepEqual(
    sanitizeRecord({ nfc: "NFC-123", nfc_hash: "stored-hash" }),
    { nfc: "[REDACTED]", nfc_hash: "[REDACTED]" },
  );
});

test("employee login failures are rate limited and success can clear them", () => {
  const ip = `employee-login-test-${Date.now()}-${Math.random()}`;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    AssertEmployeeLoginAllowed(ip);
    RegisterEmployeeLoginFailure(ip);
  }

  assert.throws(
    () => AssertEmployeeLoginAllowed(ip),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 429);
      assert.equal(error.message, "EMPLOYEE_LOGIN_TOO_MANY_ATTEMPTS");
      return true;
    },
  );

  ClearEmployeeLoginFailures(ip);
  assert.doesNotThrow(() => AssertEmployeeLoginAllowed(ip));
});
