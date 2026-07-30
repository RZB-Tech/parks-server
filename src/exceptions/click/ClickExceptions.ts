type ClickRequestBody = Record<string, unknown>;

const value = (body: ClickRequestBody, key: string) => {
  const item = body[key];

  return typeof item === "string" || typeof item === "number"
    ? String(item)
    : "";
};

export const ClickErrors = {
  success: () => ({
    code: 0,
    note: "Success",
  }),
  signFailed: () => ({
    code: -1,
    note: "SIGN CHECK FAILED!",
  }),
  invalidAmount: () => ({
    code: -2,
    note: "Incorrect parameter amount",
  }),
  invalidAction: () => ({
    code: -3,
    note: "Action not found",
  }),
  alreadyPaid: () => ({
    code: -4,
    note: "Already paid",
  }),
  orderNotFound: () => ({
    code: -5,
    note: "Order not found",
  }),
  transactionNotFound: () => ({
    code: -6,
    note: "Transaction not found",
  }),
  updateFailed: () => ({
    code: -7,
    note: "Failed to update order",
  }),
  invalidRequest: () => ({
    code: -8,
    note: "Error in request from Click",
  }),
  cancelled: () => ({
    code: -9,
    note: "Transaction cancelled",
  }),
};

export const ClickErrorResponse = (
  body: ClickRequestBody,
  error: { code: number; note: string },
) => ({
  click_trans_id: value(body, "click_trans_id"),
  merchant_trans_id: value(body, "merchant_trans_id"),
  error: error.code,
  error_note: error.note,
});

export const ClickSuccessResponse = (
  body: ClickRequestBody,
  data: {
    merchant_prepare_id?: number;
    merchant_confirm_id?: number;
  },
) => ({
  ...ClickErrorResponse(body, ClickErrors.success()),
  ...data,
});

export const ClickSystemErrorResponse = (body: ClickRequestBody) =>
  ClickErrorResponse(body, ClickErrors.updateFailed());
