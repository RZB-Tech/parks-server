import assert from "node:assert/strict";
import { test } from "node:test";
import { UserStatusTypes } from "../src/models/postgresql/client/user-model/enums";
import { UserModel } from "../src/plugins/db/postgresql/db";
import { UpdateAgreementService } from "../src/services/client/user-services/UserServices";

test("user agreement acceptance can be enabled and disabled", async (t) => {
  let agreementAccepted = false;
  let updateCalls = 0;

  t.mock.method(UserModel, "findOne", async () =>
    ({
      status: UserStatusTypes.ACTIVE,
      get agreement_accepted() {
        return agreementAccepted;
      },
      update: async (values: { agreement_accepted: boolean }) => {
        updateCalls += 1;
        agreementAccepted = values.agreement_accepted;
      },
    }) as any,
  );

  assert.deepEqual(
    await UpdateAgreementService(123, { agreement_accepted: true }),
    {
      agreement_accepted: true,
    },
  );
  assert.deepEqual(
    await UpdateAgreementService(123, { agreement_accepted: false }),
    {
      agreement_accepted: false,
    },
  );
  assert.equal(agreementAccepted, false);
  assert.equal(updateCalls, 2);
});

test("user agreement update is idempotent", async (t) => {
  let updateCalls = 0;

  t.mock.method(UserModel, "findOne", async () =>
    ({
      status: UserStatusTypes.ACTIVE,
      agreement_accepted: true,
      update: async () => {
        updateCalls += 1;
      },
    }) as any,
  );

  assert.deepEqual(
    await UpdateAgreementService(123, { agreement_accepted: true }),
    {
      agreement_accepted: true,
    },
  );
  assert.equal(updateCalls, 0);
});

test("user agreement update rejects non-boolean values", async () => {
  await assert.rejects(
    UpdateAgreementService(123, { agreement_accepted: "true" } as any),
    (error: any) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "AGREEMENT_ACCEPTED_INVALID");
      return true;
    },
  );
});
