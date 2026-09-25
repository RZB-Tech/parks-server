import assert from "node:assert/strict";
import { test } from "node:test";
import { UserStatusTypes } from "../src/models/postgresql/client/user-model/enums";
import { UserModel } from "../src/plugins/db/postgresql/db";
import { AcceptAgreementService } from "../src/services/client/user-services/UserServices";

test("user agreement can be accepted repeatedly", async (t) => {
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

  assert.deepEqual(await AcceptAgreementService(123), {
    agreement_accepted: true,
  });
  assert.deepEqual(await AcceptAgreementService(123), {
    agreement_accepted: true,
  });
  assert.equal(agreementAccepted, true);
  assert.equal(updateCalls, 1);
});
