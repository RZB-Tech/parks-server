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
  addAccountingZReportAmount,
  CashboxReportsTodayDTO,
  CashboxXReportDTO,
  emptyAccountingZReport,
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

export const StatusCashboxReportService = async (
  operatorID: number,
  params: CashboxReportsParams,
  body: CloseCashboxReportData,
) => {
  const allowedReportTypes = [
    CashboxReportTypes.XREPORT,
    CashboxReportTypes.ZREPORT,
  ];

  if (!allowedReportTypes.includes(body.report_type)) {
    throw BadRequest("Invalid report type!");
  }

  const allowedStatuses = [
    CashboxReportStatusTypes.OPEN,
    CashboxReportStatusTypes.STOPPED,
    CashboxReportStatusTypes.CLOSED,
  ];

  if (!allowedStatuses.includes(body.status)) {
    throw BadRequest("Invalid report status!");
  }

  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { start, end } = getTodayRange();

    const targetStatus = body.status;

    const getSourceStatuses = () => {
      if (targetStatus === CashboxReportStatusTypes.STOPPED) {
        return [CashboxReportStatusTypes.OPEN];
      }

      if (targetStatus === CashboxReportStatusTypes.OPEN) {
        return [CashboxReportStatusTypes.STOPPED];
      }

      if (targetStatus === CashboxReportStatusTypes.CLOSED) {
        return [
          CashboxReportStatusTypes.OPEN,
          CashboxReportStatusTypes.STOPPED,
        ];
      }

      return [];
    };

    const sourceStatuses = getSourceStatuses();

    const baseWhere: any = {
      cashbox: params.cashboxID,
      report_type: body.report_type,
      created_at: {
        [Op.between]: [start, end],
      },
    };

    if (body.report_type === CashboxReportTypes.XREPORT) {
      baseWhere.operator = operatorID;
    }

    const report = await CashboxReportModel.findOne({
      where: {
        ...baseWhere,
        status: {
          [Op.in]: sourceStatuses,
        },
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!report) {
      const alreadySameStatus = await CashboxReportModel.findOne({
        where: {
          ...baseWhere,
          status: targetStatus,
        },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (alreadySameStatus) {
        throw BadRequest(`Report is already ${targetStatus}!`);
      }

      throw BadRequest("Report not found!");
    }

    if (
      body.report_type === CashboxReportTypes.ZREPORT &&
      targetStatus === CashboxReportStatusTypes.CLOSED
    ) {
      const notClosedXReport = await CashboxReportModel.findOne({
        where: {
          cashbox: params.cashboxID,
          report_type: CashboxReportTypes.XREPORT,
          zreport: report.id,
          status: {
            [Op.in]: [
              CashboxReportStatusTypes.OPEN,
              CashboxReportStatusTypes.STOPPED,
            ],
          },
        },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (notClosedXReport) {
        throw BadRequest("Close all X reports before closing Z report!");
      }
    }

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === CashboxReportStatusTypes.STOPPED) {
      updateData.stopped_at = new Date();
    }

    if (targetStatus === CashboxReportStatusTypes.OPEN) {
      updateData.stopped_at = null;
      updateData.closed_at = null;
    }

    if (targetStatus === CashboxReportStatusTypes.CLOSED) {
      updateData.closed_at = new Date();
    }

    await report.update(updateData, {
      transaction: dbTransaction,
    });

    return true;
  });
};

export const GetZReportsService = async (query: GetZReportsQuery) => {
  const { start, end } = getDateRange(query.date);

  const baseReportWhere = {
    report_type: CashboxReportTypes.ZREPORT,
    created_at: {
      [Op.between]: [start, end],
    },
  };

  const allReports = await CashboxReportModel.findAll({
    where: baseReportWhere,
    order: [
      ["cashbox", "ASC"],
      ["created_at", "ASC"],
    ],
  });

  const allReportsPlain = allReports.map(
    (report) => report.get({ plain: true }) as CashboxReportModelI,
  );

  const totals = emptyAccountingZReport();

  const stats = {
    total: 0,
    open: 0,
    stopped: 0,
    waiting: 0,
    confirmed: 0,
    cancelled: 0,
  };

  for (const report of allReportsPlain) {
    stats.total += 1;

    addAccountingZReportAmount(totals, report);

    if (report.status === CashboxReportStatusTypes.OPEN) {
      stats.open += 1;
    }

    if (report.status === CashboxReportStatusTypes.STOPPED) {
      stats.stopped += 1;
    }

    if (report.status === CashboxReportStatusTypes.CLOSED) {
      stats.waiting += 1;
    }

    if (report.status === CashboxReportStatusTypes.CONFIRMED) {
      stats.confirmed += 1;
    }

    if (report.status === CashboxReportStatusTypes.CANCELLED) {
      stats.cancelled += 1;
    }
  }

  const cashboxes = await CashboxModel.findAll({
    order: [["id", "DESC"]],
    include: [
      {
        model: CashboxReportModel,
        as: "reports",
        required: false,
        separate: true,
        where: baseReportWhere,
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

  return {
    stats,
    totals,
    cashboxes: cashboxes.map((cashbox) =>
      ZReportCashboxWithReportsDTO(
        cashbox.get({ plain: true }) as CashboxWithZReportsPlain,
      ),
    ),
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
