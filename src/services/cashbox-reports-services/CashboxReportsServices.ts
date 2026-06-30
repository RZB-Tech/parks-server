import { Op } from "sequelize";
import { BadRequest, NotFound } from "../../exceptions";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import {
  getAccountingDateRange,
  getDateRange,
  getTodayRange,
} from "../../utils/date";
import {
  AccountingCashboxReportsDTO,
  CashboxReportsTodayDTO,
  CashboxXReportDTO,
  ZReportCashboxWithReportsDTO,
  ZReportDTO,
} from "../../dtos/cashbox-reports-dtos/CashboxReportDto";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import {
  AccountingCashboxReportsResponseDTO,
  CashboxReportWithOperatorPlain,
  CashboxWithZReportsPlain,
} from "../../dtos/cashbox-reports-dtos/types";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";

export const OpenCashboxReportService = async (
  operatorID: number,
  params: CashboxReportsParams,
) => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  const cashboxID = Number(params.cashboxID);
  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    const { start, end } = getTodayRange();

    const openedXReport = await CashboxReportModel.findOne({
      where: {
        operator: operatorID,
        cashbox: cashboxID,
        report_type: CashboxReportTypes.XREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
      transaction: transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (openedXReport) {
      throw BadRequest("X report is already opened!");
    }

    let zReport = await CashboxReportModel.findOne({
      where: {
        cashbox: cashboxID,
        report_type: CashboxReportTypes.ZREPORT,
        created_at: {
          [Op.between]: [start, end],
        },
      },
      transaction: transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!zReport) {
      zReport = await CashboxReportModel.create(
        {
          cashbox: cashboxID,
          operator: operatorID,
          report_type: CashboxReportTypes.ZREPORT,
          report_date: new Date(),
          status: CashboxReportStatusTypes.OPEN,
          opened_at: new Date(),
        },
        {
          transaction: transaction,
        },
      );
    }

    const xReport = await CashboxReportModel.create(
      {
        cashbox: cashboxID,
        operator: operatorID,
        report_type: CashboxReportTypes.XREPORT,
        zreport: Number(zReport.id),
        report_date: new Date(),
        status: CashboxReportStatusTypes.OPEN,
        opened_at: new Date(),
      },
      {
        transaction: transaction,
      },
    );

    await CashboxReportModel.increment(
      {
        xreports_count: 1,
      },
      {
        where: {
          id: zReport.id,
        },
        transaction: transaction,
      },
    );

    const xReportWithOperator = await CashboxReportModel.findByPk(xReport.id, {
      include: [
        {
          model: EmployeeModel,
          as: "operators",
          required: false,
          attributes: ["id", "firstname", "lastname", "file"],
        },
      ],
      transaction: transaction,
    });

    if (!xReportWithOperator) {
      throw NotFound("X report not found!");
    }

    return CashboxXReportDTO(
      xReportWithOperator.get({
        plain: true,
      }) as CashboxReportWithOperatorPlain,
    );
  });
};

export const GetTodayCashboxReportsService = async (
  operatorID: number,
  params: CashboxReportsParams,
) => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  const cashboxID = Number(params.cashboxID);

  const { start, end } = getTodayRange();

  const zReport = await CashboxReportModel.findOne({
    where: {
      cashbox: cashboxID,
      report_type: CashboxReportTypes.ZREPORT,
      created_at: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
        attributes: ["id", "firstname", "lastname", "file"],
      },
    ],
    order: [["id", "DESC"]],
  });

  const xReports = await CashboxReportModel.findAll({
    where: {
      operator: operatorID,
      cashbox: cashboxID,
      report_type: CashboxReportTypes.XREPORT,
      created_at: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
        attributes: ["id", "firstname", "lastname", "file"],
      },
    ],
    order: [["id", "DESC"]],
  });

  return CashboxReportsTodayDTO({
    zreport: zReport
      ? (zReport.get({ plain: true }) as CashboxReportWithOperatorPlain)
      : null,

    xreports: xReports.map(
      (report) => report.get({ plain: true }) as CashboxReportWithOperatorPlain,
    ),
  });
};

export const CloseCashboxReportService = async (
  operatorID: number,
  params: CashboxReportsParams,
  body: CloseCashboxReportData,
) => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  if (!body.report_type) {
    throw BadRequest("Report type is required!");
  }

  const cashboxID = Number(params.cashboxID);

  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { start, end } = getTodayRange();

    if (body.report_type === CashboxReportTypes.XREPORT) {
      const xReport = await CashboxReportModel.findOne({
        where: {
          operator: operatorID,
          cashbox: cashboxID,
          report_type: CashboxReportTypes.XREPORT,
          status: CashboxReportStatusTypes.OPEN,
          created_at: {
            [Op.between]: [start, end],
          },
        },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (!xReport) {
        throw BadRequest("Open X report not found!");
      }

      await xReport.update(
        {
          status: CashboxReportStatusTypes.CLOSED,
          closed_at: new Date(),
        },
        {
          transaction: dbTransaction,
        },
      );

      return true;
    }

    if (body.report_type === CashboxReportTypes.ZREPORT) {
      const zReport = await CashboxReportModel.findOne({
        where: {
          cashbox: cashboxID,
          report_type: CashboxReportTypes.ZREPORT,
          status: CashboxReportStatusTypes.OPEN,
          created_at: {
            [Op.between]: [start, end],
          },
        },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (!zReport) {
        const closedZReport = await CashboxReportModel.findOne({
          where: {
            cashbox: cashboxID,
            report_type: CashboxReportTypes.ZREPORT,
            status: CashboxReportStatusTypes.CLOSED,
            created_at: {
              [Op.between]: [start, end],
            },
          },
          transaction: dbTransaction,
          lock: dbTransaction.LOCK.UPDATE,
        });

        if (closedZReport) {
          throw BadRequest("Z report is already closed!");
        }

        throw BadRequest("Open Z report not found!");
      }

      const openedXReport = await CashboxReportModel.findOne({
        where: {
          cashbox: cashboxID,
          report_type: CashboxReportTypes.XREPORT,
          zreport: zReport.id,
          status: CashboxReportStatusTypes.OPEN,
        },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (openedXReport) {
        throw BadRequest("Close all X reports before closing Z report!");
      }

      await zReport.update(
        {
          status: CashboxReportStatusTypes.CLOSED,
          closed_at: new Date(),
        },
        {
          transaction: dbTransaction,
        },
      );

      return true;
    }

    throw BadRequest("Invalid report type!");
  });
};

export const GetZReportsService = async (query: GetZReportsQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  const { start, end } = getDateRange(query.date);

  const baseReportWhere = {
    report_type: CashboxReportTypes.ZREPORT,
    created_at: {
      [Op.between]: [start, end],
    },
  };

  const zreportWhere =
    query.status !== undefined
      ? {
          ...baseReportWhere,
          status: query.status,
        }
      : baseReportWhere;

  const statsRows = (await CashboxReportModel.findAll({
    attributes: [
      "status",
      [
        CashboxReportModel.sequelize!.fn(
          "COUNT",
          CashboxReportModel.sequelize!.col("id"),
        ),
        "count",
      ],
    ],
    where: baseReportWhere,
    group: ["status"],
    raw: true,
  })) as unknown as StatusCountRow[];

  const stats = {
    total: 0,
    open: 0,
    waiting: 0,
    confirmed: 0,
    cancelled: 0,
  };

  for (const row of statsRows) {
    const count = Number(row.count || 0);

    stats.total += count;

    if (row.status === CashboxReportStatusTypes.OPEN) {
      stats.open = count;
    }

    if (row.status === CashboxReportStatusTypes.CLOSED) {
      stats.waiting = count;
    }

    if (row.status === CashboxReportStatusTypes.CONFIRMED) {
      stats.confirmed = count;
    }

    if (row.status === CashboxReportStatusTypes.CANCELLED) {
      stats.cancelled = count;
    }
  }

  const { rows, count } = await CashboxModel.findAndCountAll({
    distinct: true,
    limit,
    offset,
    order: [["id", "DESC"]],
    include: [
      {
        model: CashboxReportModel,
        as: "reports",
        required: false,
        separate: true,
        where: zreportWhere,
        include: [
          {
            model: EmployeeModel,
            as: "operators",
            required: false,
            attributes: ["id", "firstname", "lastname", "file"],
          },
        ],
        order: [["id", "DESC"]],
      },
    ],
  });

  const cashboxes = rows.map((cashbox) =>
    ZReportCashboxWithReportsDTO(
      cashbox.get({ plain: true }) as CashboxWithZReportsPlain,
    ),
  );

  return {
    stats,
    cashboxes,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

export const ConfirmZReportsService = async (
  operatorID: number,
  body: ConfirmZReportsData,
) => {
  if (!operatorID) {
    throw BadRequest("Admin is required!");
  }

  if (!Array.isArray(body.zreports) || body.zreports.length === 0) {
    throw BadRequest("Z reports are required!");
  }

  const allowedStatuses = [
    CashboxReportStatusTypes.CONFIRMED,
    CashboxReportStatusTypes.CANCELLED,
  ];

  for (const item of body.zreports) {
    if (!item.id) {
      throw BadRequest("Z report id is required!");
    }

    if (!allowedStatuses.includes(item.status)) {
      throw BadRequest("Invalid Z report status!");
    }
  }

  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { start, end } = getTodayRange();

    const todayZReports = await CashboxReportModel.findAll({
      where: {
        report_type: CashboxReportTypes.ZREPORT,
        created_at: {
          [Op.between]: [start, end],
        },
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (todayZReports.length === 0) {
      throw BadRequest("Today Z reports not found!");
    }

    const todayZReportIDs = todayZReports.map((report) => Number(report.id));
    const bodyZReportIDs = body.zreports.map((report) => Number(report.id));

    const uniqueBodyIDs = new Set(bodyZReportIDs);

    if (uniqueBodyIDs.size !== bodyZReportIDs.length) {
      throw BadRequest("Duplicate Z report ids are not allowed!");
    }

    if (todayZReportIDs.length !== bodyZReportIDs.length) {
      throw BadRequest("All today Z reports must be sent!");
    }

    const missingIDs = todayZReportIDs.filter((id) => !uniqueBodyIDs.has(id));

    if (missingIDs.length > 0) {
      throw BadRequest("Some today Z reports are missing!");
    }

    const todayIDSet = new Set(todayZReportIDs);

    const invalidIDs = bodyZReportIDs.filter((id) => !todayIDSet.has(id));

    if (invalidIDs.length > 0) {
      throw BadRequest("Invalid Z report ids sent!");
    }

    for (const zReport of todayZReports) {
      if (zReport.status === CashboxReportStatusTypes.OPEN) {
        throw BadRequest("All Z reports must be closed first!");
      }

      if (zReport.status === CashboxReportStatusTypes.CONFIRMED) {
        throw BadRequest("Some Z reports are already confirmed!");
      }

      if (zReport.status === CashboxReportStatusTypes.CANCELLED) {
        throw BadRequest("Some Z reports are already cancelled!");
      }
    }

    for (const item of body.zreports) {
      await CashboxReportModel.update(
        {
          status: item.status,
          checked_by: operatorID,
          closed_at: new Date(),
        },
        {
          where: {
            id: Number(item.id),
            report_type: CashboxReportTypes.ZREPORT,
            status: CashboxReportStatusTypes.CLOSED,
          },
          transaction: dbTransaction,
        },
      );
    }

    return true;
  });
};

export const ReopenZReportsService = async (
  operatorID: number,
  body: ReopenZReportData,
) => {
  if (!operatorID) {
    throw BadRequest("Admin is required!");
  }

  if (!body.zreport || !Number.isFinite(Number(body.zreport))) {
    throw BadRequest("Z report id is required!");
  }

  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { start, end } = getTodayRange();

    const zReport = await CashboxReportModel.findOne({
      where: {
        id: Number(body.zreport),
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.CLOSED,
        created_at: {
          [Op.between]: [start, end],
        },
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (zReport === null) {
      throw BadRequest("Z report not found, not today, or not closed!");
    }

    await zReport.update(
      {
        status: CashboxReportStatusTypes.OPEN,
        checked_by: operatorID,
        closed_at: null,
      },
      {
        where: {
          id: Number(body.zreport),
          report_type: CashboxReportTypes.ZREPORT,
          status: CashboxReportStatusTypes.CLOSED,
        },
        transaction: dbTransaction,
      },
    );

    return true;
  });
};

export const GetAccountingCashboxReportsService = async (
  query: GetAccountingCashboxReportsQuery,
): Promise<AccountingCashboxReportsResponseDTO> => {
  const { start, end } = getAccountingDateRange(query);

  const cashboxes = await CashboxModel.findAll({
    order: [["id", "ASC"]],
  });

  const reports = await CashboxReportModel.findAll({
    where: {
      report_type: CashboxReportTypes.ZREPORT,
      status: CashboxReportStatusTypes.CONFIRMED,
      report_date: {
        [Op.between]: [start, end],
      },
    },
    order: [
      ["cashbox", "ASC"],
      ["report_date", "ASC"],
    ],
  });

  return AccountingCashboxReportsDTO({
    start_date: start,
    end_date: end,
    cashboxes: cashboxes.map(
      (cashbox) => cashbox.get({ plain: true }) as CashboxModelI,
    ),
    reports: reports.map(
      (report) => report.get({ plain: true }) as CashboxReportModelI,
    ),
  });
};
