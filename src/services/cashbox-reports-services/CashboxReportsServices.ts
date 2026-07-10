import { Op, Transaction } from "sequelize";
import { BadRequest, NotFound } from "../../exceptions";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import {
  getAccountingDateRange,
  getDateRange,
  getTashkentDayRangeUTC,
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
import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";

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
    const { startDate, endDate } = getTashkentDayRangeUTC();

    const openedXReport = await CashboxReportModel.findOne({
      where: {
        operator: operatorID,
        report_type: CashboxReportTypes.XREPORT,
        status: {
          [Op.in]: [
            CashboxReportStatusTypes.OPEN,
            CashboxReportStatusTypes.STOPPED,
          ],
        },
        created_at: {
          [Op.between]: [startDate, endDate],
        },
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
          [Op.between]: [startDate, endDate],
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

    await CashboxModel.update(
      {
        status: CashboxStatusTypes.ACTIVE,
      },
      {
        where: {
          id: cashboxID,
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

  const { startDate, endDate } = getTashkentDayRangeUTC();

  const zReport = await CashboxReportModel.findOne({
    where: {
      cashbox: cashboxID,
      report_type: CashboxReportTypes.ZREPORT,
      created_at: {
        [Op.between]: [startDate, endDate],
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
        [Op.between]: [startDate, endDate],
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
  if (!operatorID || Number.isNaN(Number(operatorID))) {
    throw BadRequest("Operator is required!");
  }

  const cashboxID = Number(params.cashboxID);
  const reportID = Number(body.report);

  if (!cashboxID || Number.isNaN(cashboxID)) {
    throw BadRequest("Cashbox ID is invalid!");
  }

  if (!reportID || !Number.isFinite(reportID)) {
    throw BadRequest("Report ID is invalid!");
  }

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

  if (
    body.status === CashboxReportStatusTypes.STOPPED &&
    !body.description?.trim()
  ) {
    throw BadRequest("Description is required when stopping report!");
  }

  const sequelize = CashboxReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { startDate, endDate } = getTashkentDayRangeUTC();
    const now = new Date();

    const reportWhere: any = {
      id: reportID,
      cashbox: cashboxID,
      report_type: body.report_type,
      created_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    /*
     * X-report statusini faqat o‘sha report operatori o‘zgartiradi.
     * Z-report uchun operator filter yo‘q.
     */
    if (body.report_type === CashboxReportTypes.XREPORT) {
      reportWhere.operator = operatorID;
    }

    const report = await CashboxReportModel.findOne({
      where: reportWhere,
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!report) {
      throw NotFound("Report not found!");
    }

    if (report.status === body.status) {
      throw BadRequest(`Report is already ${body.status}!`);
    }

    /*
     * Ruxsat berilgan status o‘tishlari:
     *
     * OPEN    -> STOPPED
     * OPEN    -> CLOSED
     * STOPPED -> OPEN
     * STOPPED -> CLOSED
     *
     * CLOSED report qayta ochilmaydi.
     */
    const allowedTransitions: Record<string, CashboxReportStatusTypes[]> = {
      [CashboxReportStatusTypes.OPEN]: [
        CashboxReportStatusTypes.STOPPED,
        CashboxReportStatusTypes.CLOSED,
      ],

      [CashboxReportStatusTypes.STOPPED]: [
        CashboxReportStatusTypes.OPEN,
        CashboxReportStatusTypes.CLOSED,
      ],

      [CashboxReportStatusTypes.CLOSED]: [],
    };

    const transitions = allowedTransitions[report.status] ?? [];

    if (!transitions.includes(body.status)) {
      throw BadRequest(
        `Cannot change report status from ${report.status} to ${body.status}!`,
      );
    }

    /*
     * Z-report yopilishidan oldin uning barcha X-reportlari
     * CLOSED bo‘lishi kerak.
     */
    if (
      body.report_type === CashboxReportTypes.ZREPORT &&
      body.status === CashboxReportStatusTypes.CLOSED
    ) {
      const activeXReport = await CashboxReportModel.findOne({
        where: {
          cashbox: cashboxID,
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

      if (activeXReport) {
        throw BadRequest("Close all X reports before closing Z report!");
      }
    }

    const updateData: any = {
      status: body.status,
    };

    /*
     * OPEN -> STOPPED
     */
    if (body.status === CashboxReportStatusTypes.STOPPED) {
      updateData.stopped_at = now;
      updateData.description = body.description?.trim();
    }

    /*
     * STOPPED -> OPEN
     */
    if (body.status === CashboxReportStatusTypes.OPEN) {
      updateData.stopped_at = null;
      updateData.description = null;
    }

    /*
     * OPEN/STOPPED -> CLOSED
     */
    if (body.status === CashboxReportStatusTypes.CLOSED) {
      updateData.closed_at = now;

      if (body.description?.trim()) {
        updateData.description = body.description.trim();
      }
    }

    await report.update(updateData, {
      transaction: dbTransaction,
    });

    /*
     * X-report STOPPED bo‘lsa,
     * uning parent Z-reporti ham STOPPED bo‘ladi.
     */
    if (
      body.report_type === CashboxReportTypes.XREPORT &&
      body.status === CashboxReportStatusTypes.STOPPED &&
      report.zreport
    ) {
      await CashboxReportModel.update(
        {
          status: CashboxReportStatusTypes.STOPPED,
          stopped_at: now,
          description: body.description?.trim(),
        },
        {
          where: {
            id: report.zreport,
            cashbox: cashboxID,
            report_type: CashboxReportTypes.ZREPORT,
            status: CashboxReportStatusTypes.OPEN,
          },
          transaction: dbTransaction,
        },
      );
    }

    /*
     * X-report STOPPED holatdan OPEN qilinsa,
     * uning parent Z-reporti ham OPEN bo‘ladi.
     */
    if (
      body.report_type === CashboxReportTypes.XREPORT &&
      body.status === CashboxReportStatusTypes.OPEN &&
      report.zreport
    ) {
      await CashboxReportModel.update(
        {
          status: CashboxReportStatusTypes.OPEN,
          stopped_at: null,
          description: null,
        },
        {
          where: {
            id: report.zreport,
            cashbox: cashboxID,
            report_type: CashboxReportTypes.ZREPORT,
            status: CashboxReportStatusTypes.STOPPED,
          },
          transaction: dbTransaction,
        },
      );
    }

    /*
     * X-report CLOSED bo‘lsa, Z-report o‘zgarmaydi.
     *
     * Z-report faqat alohida request orqali CLOSED qilinadi.
     */
    if (
      body.report_type === CashboxReportTypes.ZREPORT &&
      body.status === CashboxReportStatusTypes.CLOSED
    ) {
      await CashboxModel.update(
        {
          status: CashboxStatusTypes.INACTIVE,
        },
        {
          where: {
            id: cashboxID,
          },
          transaction: dbTransaction,
        },
      );
    }

    /*
     * Z-report OPEN yoki X-report OPEN bo‘lsa,
     * cashbox ACTIVE holatda turadi.
     */
    if (body.status === CashboxReportStatusTypes.OPEN) {
      await CashboxModel.update(
        {
          status: CashboxStatusTypes.ACTIVE,
        },
        {
          where: {
            id: cashboxID,
          },
          transaction: dbTransaction,
        },
      );
    }

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
    const { startDate, endDate } = getTashkentDayRangeUTC();

    const todayZReports = await CashboxReportModel.findAll({
      where: {
        report_type: CashboxReportTypes.ZREPORT,
        created_at: {
          [Op.between]: [startDate, endDate],
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

export const GetNotConfirmedZReportDatesService = async () => {
  const reports = await CashboxReportModel.findAll({
    where: {
      report_type: CashboxReportTypes.ZREPORT,
      status: {
        [Op.ne]: CashboxReportStatusTypes.CONFIRMED,
      },
    },
    attributes: ["report_date"],
    group: ["report_date"],
    order: [["report_date", "DESC"]],
  });

  return reports.map((report) => report.get("report_date"));
};

export const AutoCloseUnclosedXReportsService = async () => {
  const sequelize = CashboxReportModel.sequelize!;
  return await sequelize.transaction(async (transaction) => {
    const now = new Date();

    const notClosedStatuses = [
      CashboxReportStatusTypes.OPEN,
      CashboxReportStatusTypes.STOPPED,
    ];

    const xreports = await CashboxReportModel.findAll({
      where: {
        report_type: CashboxReportTypes.XREPORT,
        status: {
          [Op.in]: notClosedStatuses,
        },
        closed_at: null,
        opened_at: {
          [Op.lte]: now,
        },
      },
      attributes: ["id", "zreport"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (xreports.length === 0) {
      return {
        closed_xreports: 0,
        message: "No unclosed X reports found.",
      };
    }

    const xreportIDs = xreports.map((item) => Number(item.id));

    const [closedCount] = await CashboxReportModel.update(
      {
        status: CashboxReportStatusTypes.CLOSED,
        closed_at: now,
      },
      {
        where: {
          id: {
            [Op.in]: xreportIDs,
          },
          report_type: CashboxReportTypes.XREPORT,
          status: {
            [Op.in]: notClosedStatuses,
          },
          closed_at: null,
        },
        transaction,
      },
    );

    const zreportIDs = [
      ...new Set(
        xreports
          .map((item) => Number(item.zreport))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    let closedZreports = 0;

    for (const zreportID of zreportIDs) {
      const openedXReportsCount = await CashboxReportModel.count({
        where: {
          zreport: zreportID,
          report_type: CashboxReportTypes.XREPORT,
          status: {
            [Op.in]: notClosedStatuses,
          },
          closed_at: null,
        },
        transaction,
      });

      if (openedXReportsCount === 0) {
        const [updatedZReports] = await CashboxReportModel.update(
          {
            operator: null,
            status: CashboxReportStatusTypes.CLOSED,
            closed_at: now,
          },
          {
            where: {
              id: zreportID,
              report_type: CashboxReportTypes.ZREPORT,
              status: {
                [Op.in]: notClosedStatuses,
              },
            },
            transaction,
          },
        );

        closedZreports += updatedZReports;
      }
    }

    return {
      closed_xreports: closedCount,
      closed_zreports: closedZreports,
      message: "Unclosed X reports and Z reports closed successfully.",
    };
  });
};
