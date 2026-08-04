import { Op, Transaction } from "sequelize";
import { InternalServerError } from "../../exceptions";
import { PaymentServiceType } from "../../models/postgresql/card-transactions-model/enums";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../../models/postgresql/cashbox-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { CashboxModel } from "../../plugins/db/postgresql/db";
import {
  getMostRecentTashkentCutoffUTC,
  getTashkentDayRangeUTC,
} from "../../utils/date";

export const ONLINE_PAYMENTS_CASHBOX_KEY = "online_payments";

export const GetOrCreateOnlineDailyZReportService = async (
  transaction: Transaction,
  referenceTime: string | Date = new Date(),
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

  const referenceDate =
    referenceTime instanceof Date ? referenceTime : new Date(referenceTime);

  if (Number.isNaN(referenceDate.getTime())) {
    throw InternalServerError("INVALID_ONLINE_REPORT_REFERENCE_TIME");
  }

  const { startDate, endDate } = getTashkentDayRangeUTC(referenceDate);
  const now = new Date();

  /*
   * Heal stale daily reports before opening/using today's report. Checking
   * OPEN and STOPPED also normalizes legacy rows whose closed_at is already set.
   */
  await CashboxReportModel.update(
    {
      status: CashboxReportStatusTypes.CLOSED,
      closed_at: now,
    },
    {
      where: {
        cashbox: cashbox.id,
        report_type: CashboxReportTypes.ZREPORT,
        status: {
          [Op.in]: [
            CashboxReportStatusTypes.OPEN,
            CashboxReportStatusTypes.STOPPED,
          ],
        },
        report_date: {
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
      status: CashboxReportStatusTypes.OPEN,
      report_date: {
        [Op.between]: [startDate, endDate],
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!report) {
    const existingCurrentReport = await CashboxReportModel.findOne({
      where: {
        cashbox: cashbox.id,
        report_type: CashboxReportTypes.ZREPORT,
        report_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    /*
     * Never append a payment to a report that the 23:59 workflow has closed.
     * The provider can retry after midnight, when a new daily report is open.
     */
    if (existingCurrentReport) {
      throw InternalServerError("ONLINE_DAILY_ZREPORT_IS_NOT_OPEN");
    }

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

  await CashboxModel.update(
    {
      status: CashboxStatusTypes.ACTIVE,
    },
    {
      where: {
        id: cashbox.id,
        status: CashboxStatusTypes.INACTIVE,
      },
      transaction,
    },
  );

  return {
    cashbox,
    report,
  };
};

export const CloseOnlineDailyZReportService = async (
  referenceTime: string | Date = new Date(),
) => {
  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
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

    const now = new Date();
    const cutoff = getMostRecentTashkentCutoffUTC(
      referenceTime,
      23,
      59,
    );

    const [closedReports] = await CashboxReportModel.update(
      {
        operator: null,
        status: CashboxReportStatusTypes.CLOSED,
        closed_at: now,
      },
      {
        where: {
          cashbox: cashbox.id,
          report_type: CashboxReportTypes.ZREPORT,
          status: {
            [Op.in]: [
              CashboxReportStatusTypes.OPEN,
              CashboxReportStatusTypes.STOPPED,
            ],
          },
          opened_at: {
            [Op.lte]: cutoff,
          },
        },
        transaction,
      },
    );

    const remainingActiveReports = await CashboxReportModel.count({
      where: {
        cashbox: cashbox.id,
        report_type: CashboxReportTypes.ZREPORT,
        status: {
          [Op.in]: [
            CashboxReportStatusTypes.OPEN,
            CashboxReportStatusTypes.STOPPED,
          ],
        },
      },
      transaction,
    });

    let reconciledCashboxes = 0;

    if (remainingActiveReports === 0) {
      [reconciledCashboxes] = await CashboxModel.update(
        {
          status: CashboxStatusTypes.INACTIVE,
        },
        {
          where: {
            id: cashbox.id,
            status: CashboxStatusTypes.ACTIVE,
          },
          transaction,
        },
      );
    }

    return {
      cashbox: Number(cashbox.id),
      closed_zreports: closedReports,
      reconciled_cashboxes: reconciledCashboxes,
      cutoff: cutoff.toISOString(),
    };
  });
};

export const OpenOnlineDailyZReportService = async (
  referenceTime: string | Date = new Date(),
) => {
  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    const { cashbox, report } =
      await GetOrCreateOnlineDailyZReportService(transaction, referenceTime);

    return {
      cashbox: Number(cashbox.id),
      report: Number(report.id),
      status: report.status,
      opened_at: report.opened_at,
    };
  });
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
