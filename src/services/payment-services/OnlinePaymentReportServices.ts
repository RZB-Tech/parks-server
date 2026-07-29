import { Op, Transaction } from "sequelize";
import { InternalServerError } from "../../exceptions";
import { PaymentServiceType } from "../../models/postgresql/card-transactions-model/enums";
import { CashboxTypes } from "../../models/postgresql/cashbox-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { CashboxModel } from "../../plugins/db/postgresql/db";
import { getTashkentDayRangeUTC } from "../../utils/date";

export const ONLINE_PAYMENTS_CASHBOX_KEY = "online_payments";

export const GetOrCreateOnlineDailyZReportService = async (
  transaction: Transaction,
) => {
  const cashbox = await CashboxModel.findOne({
    where: {
      system_key: ONLINE_PAYMENTS_CASHBOX_KEY,
      type: CashboxTypes.VIRTUAL,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!cashbox) {
    throw InternalServerError("ONLINE_PAYMENTS_CASHBOX_NOT_CONFIGURED");
  }

  const { startDate, endDate } = getTashkentDayRangeUTC();
  const now = new Date();

  await CashboxReportModel.update(
    {
      status: CashboxReportStatusTypes.CLOSED,
      closed_at: now,
    },
    {
      where: {
        cashbox: cashbox.id,
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.OPEN,
        created_at: {
          [Op.lt]: startDate,
        },
      },
      transaction,
    },
  );

  let report = await CashboxReportModel.findOne({
    where: {
      cashbox: cashbox.id,
      report_type: CashboxReportTypes.ZREPORT,
      created_at: {
        [Op.between]: [startDate, endDate],
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!report) {
    report = await CashboxReportModel.create(
      {
        operator: null,
        cashbox: Number(cashbox.id),
        checked_by: null,
        report_type: CashboxReportTypes.ZREPORT,
        zreport: null,
        report_date: startDate,
        status: CashboxReportStatusTypes.OPEN,
        description: "Online payments daily Z-report",
        opened_at: now,
        stopped_at: null,
        closed_at: null,
      },
      { transaction },
    );
  }

  return {
    cashbox,
    report,
  };
};

const providerAmountField = (provider: PaymentServiceType) => {
  switch (provider) {
    case PaymentServiceType.PAYME:
      return "payme_amount" as const;
    case PaymentServiceType.UZUM:
      return "uzum_amount" as const;
    case PaymentServiceType.CLICK:
      return "click_amount" as const;
  }
};

const providerRefundField = (provider: PaymentServiceType) => {
  switch (provider) {
    case PaymentServiceType.PAYME:
      return "payme_refunded_amount" as const;
    case PaymentServiceType.UZUM:
      return "uzum_refunded_amount" as const;
    case PaymentServiceType.CLICK:
      return "click_refunded_amount" as const;
  }
};

export const AddOnlinePaymentToDailyZReportService = async (
  provider: PaymentServiceType,
  amount: number,
  transaction: Transaction,
) => {
  const { cashbox, report } =
    await GetOrCreateOnlineDailyZReportService(transaction);
  const providerField = providerAmountField(provider);

  await report.increment(
    {
      total_amount: amount,
      online_amount: amount,
      transactions_count: 1,
      [providerField]: amount,
    },
    { transaction },
  );

  return {
    cashbox,
    report,
  };
};

export const AddOnlineRefundToDailyZReportService = async (
  provider: PaymentServiceType,
  amount: number,
  transaction: Transaction,
) => {
  const { cashbox, report } =
    await GetOrCreateOnlineDailyZReportService(transaction);
  const providerField = providerRefundField(provider);

  await report.increment(
    {
      refunded_amount: amount,
      refund_transactions_count: 1,
      [providerField]: amount,
    },
    { transaction },
  );

  return {
    cashbox,
    report,
  };
};
