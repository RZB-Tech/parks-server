import { Op, QueryTypes, Transaction } from "sequelize";
import { VIRTUAL_CARD_BONUS_AMOUNT } from "../../consts/card";
import { OnlinePaymentDailyReportDTO } from "../../dtos/online-payment-reports-dtos/OnlinePaymentReportDto";
import { BadRequest, InternalServerError } from "../../exceptions";
import { PaymentServiceType } from "../../models/postgresql/card-transactions-model/enums";
import { CardType } from "../../models/postgresql/cards-model/enums";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../../models/postgresql/cashbox-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import {
  CardModel,
  CashboxModel,
  UserModel,
} from "../../plugins/db/postgresql/db";
import {
  getMostRecentTashkentCutoffUTC,
  getTashkentDateOnly,
  getTashkentDayRangeUTC,
  getTashkentRangeUTC,
} from "../../utils/date";
import { GetOnlinePaymentDailyReportQuery } from "../../controllers/online-payment-reports-controllers/types";

export const ONLINE_PAYMENTS_CASHBOX_KEY = "online_payments";
const ONLINE_PAYMENTS_CASHBOX_LOCK =
  "parks-server:ensure-online-payments-cashbox";

export const EnsureOnlinePaymentsCashboxService = async () => {
  const sequelize = CashboxModel.sequelize!;

  return sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: ONLINE_PAYMENTS_CASHBOX_LOCK },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    let cashbox = await CashboxModel.findOne({
      where: { system_key: ONLINE_PAYMENTS_CASHBOX_KEY },
      paranoid: false,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (cashbox) {
      if (cashbox.deleted_at) {
        await cashbox.restore({ transaction });
      }

      if (cashbox.type !== CashboxTypes.VIRTUAL) {
        await cashbox.update(
          { type: CashboxTypes.VIRTUAL },
          { transaction },
        );
      }

      return cashbox;
    }

    cashbox = await CashboxModel.create(
      {
        name: "Касса приложений",
        place: "Telegram бот, мобильное приложение",
        status: CashboxStatusTypes.INACTIVE,
        type: CashboxTypes.VIRTUAL,
        system_key: ONLINE_PAYMENTS_CASHBOX_KEY,
        description: "System cashbox for online payments",
        latitude: null,
        longitude: null,
      },
      { transaction },
    );

    return cashbox;
  });
};

type CountRow = {
  count: string | number;
};

export const GetOnlinePaymentDailyReportService = async (
  query: GetOnlinePaymentDailyReportQuery = {},
) => {
  const hasDate = query.date !== undefined;
  const hasFrom = query.from !== undefined;
  const hasTo = query.to !== undefined;

  if (hasDate && (hasFrom || hasTo)) {
    throw BadRequest("DATE_AND_DATE_RANGE_CANNOT_BE_USED_TOGETHER");
  }

  let from: string;
  let to: string;
  let startDate: Date;
  let endDate: Date;

  if (hasFrom || hasTo) {
    if (!hasFrom || !hasTo) {
      throw BadRequest("FROM_AND_TO_ARE_REQUIRED_TOGETHER");
    }

    from = query.from!.trim();
    to = query.to!.trim();

    if (!from || !to) {
      throw BadRequest("DATE_RANGE_IS_INVALID");
    }

    ({ startDate, endDate } = getTashkentRangeUTC(from, to));
  } else {
    const date = hasDate ? query.date!.trim() : getTashkentDateOnly();

    if (!date) {
      throw BadRequest("DATE_IS_INVALID");
    }

    from = date;
    to = date;
    ({ startDate, endDate } = getTashkentDayRangeUTC(date));
  }

  const sequelize = CashboxReportModel.sequelize!;

  const cashbox = await CashboxModel.findOne({
    where: {
      system_key: ONLINE_PAYMENTS_CASHBOX_KEY,
      type: CashboxTypes.VIRTUAL,
    },
    attributes: ["id"],
  });

  if (!cashbox) {
    throw InternalServerError("ONLINE_PAYMENTS_CASHBOX_NOT_CONFIGURED");
  }

  const [
    reports,
    registeredUsersCount,
    virtualCardsOpenedCount,
    registeredUsersWithVirtualCardRows,
  ] = await Promise.all([
    CashboxReportModel.findAll({
      where: {
        cashbox: cashbox.id,
        report_type: CashboxReportTypes.ZREPORT,
        report_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [
        ["report_date", "ASC"],
        ["id", "ASC"],
      ],
    }),
    UserModel.count({
      where: {
        registered_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      paranoid: false,
    }),
    CardModel.count({
      where: {
        type: CardType.VIRTUAL,
        activated_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      paranoid: false,
    }),
    sequelize.query<CountRow>(
      `
        SELECT COUNT(DISTINCT users.id) AS count
        FROM users
        INNER JOIN cards
          ON cards."user" = users.id
        WHERE users.registered_at BETWEEN :startDate AND :endDate
          AND cards.type = :virtualCardType
          AND cards.activated_at BETWEEN :startDate AND :endDate
      `,
      {
        replacements: {
          startDate,
          endDate,
          virtualCardType: CardType.VIRTUAL,
        },
        type: QueryTypes.SELECT,
      },
    ),
  ]);

  const registeredUsersWithVirtualCardCount = Number(
    registeredUsersWithVirtualCardRows[0]?.count ?? 0,
  );
  return OnlinePaymentDailyReportDTO({
    from,
    to,
    reports,
    registered_users_count: registeredUsersCount,
    virtual_cards_opened_count: virtualCardsOpenedCount,
    registered_users_with_virtual_card_count:
      registeredUsersWithVirtualCardCount,
    bonus_per_virtual_card: VIRTUAL_CARD_BONUS_AMOUNT,
  });
};

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
    const cutoff = getMostRecentTashkentCutoffUTC(referenceTime, 23, 59);

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
    const { cashbox, report } = await GetOrCreateOnlineDailyZReportService(
      transaction,
      referenceTime,
    );

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
    case PaymentServiceType.ONEQR:
      return "oneqr_amount" as const;
    case PaymentServiceType.PAYME:
      return "payme_amount" as const;
    case PaymentServiceType.UZUM:
      return "uzum_amount" as const;
    case PaymentServiceType.CLICK:
      return "click_amount" as const;
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
      [providerField]: amount,
    },
    { transaction },
  );

  return {
    cashbox,
    report,
  };
};
