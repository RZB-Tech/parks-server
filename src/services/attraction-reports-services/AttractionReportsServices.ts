import { Op, Transaction } from "sequelize";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../../models/postgresql/attraction-model/enums";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import {
  AccountingAttractionReportsDTO,
  addAttractionZReportsTotals,
  AttractionReportDTO,
  AttractionReportsTodayDTO,
  AttractionZReportAttractionDTO,
  emptyAttractionZReportsTotals,
} from "../../dtos/attraction-reports-dtos/AttractionReportDto";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import {
  getAccountingDateRange,
  getDateRange,
  getTashkentDayRangeUTC,
  getTodayRange,
} from "../../utils/date";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";

export const OpenAttractionReportService = async (
  operatorID: number,
  deviceID: number,
  params: AttractionReportParams,
) => {
  if (!operatorID || Number.isNaN(operatorID)) {
    throw BadRequest("Operator ID is invalid!");
  }

  if (!deviceID || Number.isNaN(deviceID)) {
    throw BadRequest("Device ID is invalid!");
  }

  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const sequelize = AttractionReportModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    const { start, end } = getTodayRange();
    const now = new Date();

    /*
     * Attraction lock qilinadi.
     */
    const attraction = await AttractionModel.findByPk(attractionID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!attraction) {
      throw NotFound("Attraction not found!");
    }

    /*
     * Headerdagi device-id aynan shu attractionga
     * biriktirilgan bo‘lishi kerak.
     */
    if (Number(attraction.device) !== deviceID) {
      throw BadRequest("This device is not assigned to this attraction!");
    }

    /*
     * Shu attractionda OPEN yoki STOPPED X-report mavjudligini
     * tekshiramiz.
     */
    const activeXReport = await AttractionReportModel.findOne({
      where: {
        attraction: attractionID,
        report_type: AttractionReportTypes.XREPORT,
        status: {
          [Op.in]: [
            AttractionReportStatusTypes.OPEN,
            AttractionReportStatusTypes.STOPPED,
          ],
        },
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (activeXReport) {
      if (Number(activeXReport.operator) === operatorID) {
        throw Conflict(
          "You already have an active X report on this attraction!",
        );
      }

      throw Conflict(
        "Another operator already has an active X report on this attraction!",
      );
    }

    /*
     * Bugungi Z-reportni topamiz.
     */
    let zReport = await AttractionReportModel.findOne({
      where: {
        attraction: attractionID,
        report_type: AttractionReportTypes.ZREPORT,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (zReport) {
      if (
        [
          AttractionReportStatusTypes.CLOSED,
          AttractionReportStatusTypes.CONFIRMED,
        ].includes(zReport.status)
      ) {
        throw BadRequest("Today Z report is already closed!");
      }

      if (zReport.status === AttractionReportStatusTypes.STOPPED) {
        await zReport.update(
          {
            status: AttractionReportStatusTypes.OPEN,
            stopped_at: null,
            closed_at: null,
          },
          {
            transaction,
          },
        );
      }
    } else {
      zReport = await AttractionReportModel.create(
        {
          attraction: attractionID,
          operator: operatorID,
          report_type: AttractionReportTypes.ZREPORT,
          zreport: null,
          status: AttractionReportStatusTypes.OPEN,
          opened_at: now,
        },
        {
          transaction,
        },
      );
    }

    /*
     * Yangi X-report ochiladi.
     */
    const xReport = await AttractionReportModel.create(
      {
        attraction: attractionID,
        operator: operatorID,
        report_type: AttractionReportTypes.XREPORT,
        zreport: Number(zReport.id),
        status: AttractionReportStatusTypes.OPEN,
        opened_at: now,
      },
      {
        transaction,
      },
    );

    await attraction.update(
      {
        status: AttractionStatusTypes.ACTIVE,
      },
      {
        transaction,
      },
    );

    return AttractionReportDTO(
      xReport.get({
        plain: true,
      }),
    );
  });
};

export const GetPaymentOperatorAttractionService = async (
  operatorID: number,
  attractionID: number,
  transaction: Transaction,
): Promise<PaymentOperatorAttractionData> => {
  const operatorAttraction = await AttractionOperatorModel.findOne({
    where: {
      operator: operatorID,
      attraction: attractionID,
      status: AttractionOperatorStatusTypes.ACTIVE,
    },
    include: [
      {
        model: AttractionModel,
        as: "attractions",
        required: true,
        where: {
          status: AttractionStatusTypes.ACTIVE,
        },
        attributes: ["id", "name", "price", "seats"],
      },
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (operatorAttraction === null) {
    throw NotFound("Operator attraction not found!");
  }

  return operatorAttraction.get({
    plain: true,
  }) as PaymentOperatorAttractionData;
};

export const GetOpenAttractionReportService = async (
  operatorID: number,
  attractionID: number,
  transaction: Transaction,
): Promise<AttractionReportModel | null> => {
  return await AttractionReportModel.findOne({
    where: {
      operator: operatorID,
      attraction: attractionID,
      status: AttractionReportStatusTypes.OPEN,
      report_type: AttractionReportTypes.XREPORT,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

export const GetOrCreateOpenAttractionRoundService = async (
  report: AttractionReportModel,
  attractionID: number,
  operatorID: number,
  transaction: Transaction,
): Promise<AttractionRoundModel> => {
  const openRound = await AttractionRoundModel.findOne({
    where: {
      report: Number(report.id),
      attraction: attractionID,
      operator: operatorID,
      status: AttractionRoundStatusTypes.OPEN,
    },
    order: [["round_number", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (openRound !== null) {
    return openRound;
  }

  const lastRound = await AttractionRoundModel.findOne({
    where: {
      report: Number(report.id),
      attraction: attractionID,
      operator: operatorID,
    },
    order: [["round_number", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const nextRoundNumber =
    lastRound !== null ? Number(lastRound.round_number) + 1 : 1;

  return await AttractionRoundModel.create(
    {
      report: Number(report.id),
      attraction: attractionID,
      operator: operatorID,
      round_number: nextRoundNumber,
      status: AttractionRoundStatusTypes.OPEN,
      started_at: new Date(),
    },
    {
      transaction,
    },
  );
};

export const UpdateAttractionReportStatusService = async (
  operatorID: number,
  params: AttractionReportParams,
  body: UpdateAttractionReportStatusData,
) => {
  if (!operatorID || Number.isNaN(Number(operatorID))) {
    throw BadRequest("Operator ID is invalid!");
  }

  const attractionID = Number(params.attractionID);
  const reportID = Number(params.reportID);

  if (!attractionID || !Number.isFinite(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  if (!reportID || !Number.isFinite(reportID)) {
    throw BadRequest("Report ID is invalid!");
  }

  const allowedStatuses = [
    AttractionReportStatusTypes.OPEN,
    AttractionReportStatusTypes.STOPPED,
    AttractionReportStatusTypes.CLOSED,
  ];

  if (!allowedStatuses.includes(body.status)) {
    throw BadRequest("Invalid report status!");
  }

  const sequelize = AttractionReportModel.sequelize!;

  return await sequelize.transaction(async (transaction: Transaction) => {
    const { startDate, endDate } = getTashkentDayRangeUTC();

    const now = new Date();

    /*
     * Attraction mavjudligini tekshiramiz va lock qilamiz.
     */
    const attraction = await AttractionModel.findByPk(attractionID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!attraction) {
      throw NotFound("Attraction not found!");
    }

    /*
     * Current employee va uning rolini olamiz.
     */
    const currentEmployee = await EmployeeModel.findByPk(operatorID, {
      attributes: ["id", "role"],
      transaction,
    });

    if (!currentEmployee) {
      throw NotFound("Employee not found!");
    }

    const currentRole = await RoleModel.findByPk(Number(currentEmployee.role), {
      attributes: ["id", "name"],
      transaction,
    });

    if (!currentRole) {
      throw Forbidden("Employee role not found!");
    }

    const roleName = currentRole.name;

    const isSuperAdmin = roleName === "superadmin";

    /*
     * Operator shu attractionga ACTIVE holatda
     * biriktirilganini tekshiramiz.
     */
    const operatorAttraction = await AttractionOperatorModel.findOne({
      where: {
        operator: operatorID,
        attraction: attractionID,
        status: AttractionOperatorStatusTypes.ACTIVE,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    /*
     * Report faqat bugungi reportlar orasidan topiladi.
     */
    const report = await AttractionReportModel.findOne({
      where: {
        id: reportID,
        attraction: attractionID,
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!report) {
      throw NotFound("Attraction report not found!");
    }

    const isXReport = report.report_type === AttractionReportTypes.XREPORT;

    const isZReport = report.report_type === AttractionReportTypes.ZREPORT;

    if (!isXReport && !isZReport) {
      throw BadRequest("Invalid attraction report type!");
    }

    /*
     * X-reportni faqat o‘sha report operatori boshqaradi.
     *
     * Superadmin istalgan X-reportni boshqarishi mumkin.
     */
    if (isXReport && !isSuperAdmin) {
      if (!operatorAttraction) {
        throw Forbidden("Operator is not assigned to this attraction!");
      }

      if (Number(report.operator) !== operatorID) {
        throw Forbidden("You can update only your own X report!");
      }
    }

    /*
     * Ruxsat berilgan status transitionlar:
     *
     * OPEN    -> STOPPED
     * OPEN    -> CLOSED
     * STOPPED -> OPEN
     * STOPPED -> CLOSED
     *
     * CLOSED report qayta ochilmaydi.
     */
    const allowedTransitions: Record<string, AttractionReportStatusTypes[]> = {
      [AttractionReportStatusTypes.OPEN]: [
        AttractionReportStatusTypes.STOPPED,
        AttractionReportStatusTypes.CLOSED,
      ],

      [AttractionReportStatusTypes.STOPPED]: [
        AttractionReportStatusTypes.OPEN,
        AttractionReportStatusTypes.CLOSED,
      ],

      [AttractionReportStatusTypes.CLOSED]: [],
      [AttractionReportStatusTypes.CONFIRMED]: [],
    };

    const transitions = allowedTransitions[report.status] ?? [];

    if (!transitions.includes(body.status)) {
      throw BadRequest(
        `Cannot change report status from ${report.status} to ${body.status}!`,
      );
    }

    /*
     * X-reportni yopishdan oldin uning ochiq roundini
     * tekshiramiz.
     */
    if (isXReport && body.status === AttractionReportStatusTypes.CLOSED) {
      const openRound = await AttractionRoundModel.findOne({
        where: {
          report: Number(report.id),
          attraction: attractionID,
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      /*
       * Round ichida odamlar bo‘lsa, avval GO bosilib
       * round tugatilishi kerak.
       */
      if (openRound && Number(openRound.people_count || 0) > 0) {
        throw BadRequest("Close current round first!");
      }

      /*
       * Bo‘sh round bo‘lsa avtomatik CANCELLED qilamiz.
       */
      if (openRound && Number(openRound.people_count || 0) === 0) {
        await openRound.update(
          {
            status: AttractionRoundStatusTypes.CANCELLED,
            finished_at: now,
          },
          {
            transaction,
          },
        );
      }
    }

    /*
     * Z-report yopilishidan oldin unga bog‘langan barcha
     * X-reportlar CLOSED bo‘lishi kerak.
     */
    if (isZReport && body.status === AttractionReportStatusTypes.CLOSED) {
      const activeXReport = await AttractionReportModel.findOne({
        where: {
          attraction: attractionID,
          report_type: AttractionReportTypes.XREPORT,
          zreport: Number(report.id),
          status: {
            [Op.in]: [
              AttractionReportStatusTypes.OPEN,
              AttractionReportStatusTypes.STOPPED,
            ],
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (activeXReport) {
        throw BadRequest("Close all X reports before closing Z report!");
      }
    }

    const updateData: Partial<AttractionReportModelI> = {
      status: body.status,
    };

    /*
     * OPEN -> STOPPED
     */
    if (body.status === AttractionReportStatusTypes.STOPPED) {
      updateData.stopped_at = now;
    }

    /*
     * STOPPED -> OPEN
     */
    if (body.status === AttractionReportStatusTypes.OPEN) {
      updateData.stopped_at = null;
      updateData.closed_at = null;
    }

    /*
     * OPEN/STOPPED -> CLOSED
     */
    if (body.status === AttractionReportStatusTypes.CLOSED) {
      updateData.closed_at = now;
    }

    await report.update(updateData, {
      transaction,
    });

    /*
     * X-report STOPPED bo‘lsa,
     * uning parent Z-reporti ham STOPPED bo‘ladi.
     */
    if (
      isXReport &&
      body.status === AttractionReportStatusTypes.STOPPED &&
      report.zreport
    ) {
      await AttractionReportModel.update(
        {
          status: AttractionReportStatusTypes.STOPPED,
          description: body.description,
          stopped_at: now,
        },
        {
          where: {
            id: Number(report.zreport),
            attraction: attractionID,
            report_type: AttractionReportTypes.ZREPORT,
            status: AttractionReportStatusTypes.OPEN,
          },
          transaction,
        },
      );
    }

    /*
     * X-report STOPPED holatdan OPEN qilinsa,
     * uning parent Z-reporti ham OPEN bo‘ladi.
     */
    if (
      isXReport &&
      body.status === AttractionReportStatusTypes.OPEN &&
      report.zreport
    ) {
      await AttractionReportModel.update(
        {
          status: AttractionReportStatusTypes.OPEN,
          description: null,
          stopped_at: null,
          closed_at: null,
        },
        {
          where: {
            id: Number(report.zreport),
            attraction: attractionID,
            report_type: AttractionReportTypes.ZREPORT,
            status: AttractionReportStatusTypes.STOPPED,
          },
          transaction,
        },
      );
    }

    /*
     * X-report CLOSED bo‘lsa parent Z-report o‘zgarmaydi.
     * Z-report alohida request orqali yopiladi.
     */

    /*
     * Z-report CLOSED bo‘lsa attraction INACTIVE bo‘ladi.
     */
    if (isZReport && body.status === AttractionReportStatusTypes.CLOSED) {
      await attraction.update(
        {
          status: AttractionStatusTypes.INACTIVE,
        },
        {
          transaction,
        },
      );
    }

    /*
     * X yoki Z report OPEN bo‘lsa attraction ACTIVE bo‘ladi.
     */
    if (body.status === AttractionReportStatusTypes.OPEN) {
      await attraction.update(
        {
          status: AttractionStatusTypes.ACTIVE,
        },
        {
          transaction,
        },
      );
    }

    return true;
  });
};

export const GetTodayAttractionReportsService = async (
  operatorID: number,
  params: AttractionReportParams,
) => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const { start, end } = getTodayRange();

  const zReport = await AttractionReportModel.findOne({
    where: {
      attraction: attractionID,
      report_type: AttractionReportTypes.ZREPORT,
      createdAt: {
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

  const xReports = await AttractionReportModel.findAll({
    where: {
      attraction: attractionID,
      report_type: AttractionReportTypes.XREPORT,
      createdAt: {
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

  return AttractionReportsTodayDTO({
    zreport: zReport
      ? (zReport.get({ plain: true }) as AttractionReportWithOperatorPlain)
      : null,

    xreports: xReports.map(
      (report) =>
        report.get({ plain: true }) as AttractionReportWithOperatorPlain,
    ),
  });
};

export const GetAttractionZReportsService = async (
  query: GetAttractionZReportsQuery,
) => {
  const { start, end } = getDateRange(query.date);

  const baseReportWhere = {
    report_type: AttractionReportTypes.ZREPORT,
    created_at: {
      [Op.between]: [start, end],
    },
  };

  const allReports = await AttractionReportModel.findAll({
    where: baseReportWhere,
    order: [
      ["attraction", "ASC"],
      ["created_at", "ASC"],
    ],
  });

  const allReportsPlain = allReports.map(
    (report) => report.get({ plain: true }) as AttractionReportModelI,
  );

  const totals = emptyAttractionZReportsTotals();

  const stats = {
    total: 0,
    open: 0,
    stopped: 0,
    waiting: 0,
    confirmed: 0,
  };

  for (const report of allReportsPlain) {
    stats.total += 1;

    addAttractionZReportsTotals(totals, report);

    if (report.status === AttractionReportStatusTypes.OPEN) {
      stats.open += 1;
    }

    if (report.status === AttractionReportStatusTypes.STOPPED) {
      stats.stopped += 1;
    }

    if (report.status === AttractionReportStatusTypes.CLOSED) {
      stats.waiting += 1;
    }

    if (report.status === AttractionReportStatusTypes.CONFIRMED) {
      stats.confirmed += 1;
    }
  }

  const attractions = await AttractionModel.findAll({
    order: [["id", "DESC"]],
    include: [
      {
        model: AttractionReportModel,
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
    attractions: attractions.map((attraction) =>
      AttractionZReportAttractionDTO(
        attraction.get({ plain: true }) as AttractionWithZReportsPlain,
      ),
    ),
  };
};

export const ConfirmAttractionZReportsService = async (
  operatorID: number,
  body: ConfirmAttractionZReportsData,
) => {
  if (!operatorID) {
    throw BadRequest("Admin is required!");
  }

  if (!Array.isArray(body.zreports) || body.zreports.length === 0) {
    throw BadRequest("Z reports are required!");
  }

  const allowedStatuses = [AttractionReportStatusTypes.CONFIRMED];

  for (const item of body.zreports) {
    if (!item.id) {
      throw BadRequest("Z report id is required!");
    }

    if (!allowedStatuses.includes(item.status)) {
      throw BadRequest("Invalid Z report status!");
    }
  }

  const sequelize = AttractionReportModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const { startDate, endDate } = getTashkentDayRangeUTC();

    const todayZReports = await AttractionReportModel.findAll({
      where: {
        report_type: AttractionReportTypes.ZREPORT,
        createdAt: {
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
      if (
        [
          AttractionReportStatusTypes.OPEN,
          AttractionReportStatusTypes.STOPPED,
        ].includes(zReport.status)
      ) {
        throw BadRequest("All Z reports must be closed first!");
      }

      if (zReport.status === AttractionReportStatusTypes.CONFIRMED) {
        throw BadRequest("Some Z reports are already confirmed!");
      }
    }

    for (const item of body.zreports) {
      await AttractionReportModel.update(
        {
          status: item.status,
          confirmed_by: operatorID,
          confirmed_at: new Date(),
        },
        {
          where: {
            id: Number(item.id),
            report_type: AttractionReportTypes.ZREPORT,
            status: AttractionReportStatusTypes.CLOSED,
          },
          transaction: dbTransaction,
        },
      );
    }

    return true;
  });
};

export const GetAccountingAttractionReportsService = async (
  query: GetAccountingAttractionReportsQuery,
): Promise<AccountingAttractionReportsResponseDTO> => {
  const { start, end } = getAccountingDateRange(query);

  const attractions = await AttractionModel.findAll({
    order: [["id", "ASC"]],
  });

  const reports = await AttractionReportModel.findAll({
    where: {
      report_type: AttractionReportTypes.ZREPORT,
      status: AttractionReportStatusTypes.CONFIRMED,
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    order: [
      ["attraction", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  return AccountingAttractionReportsDTO({
    start_date: start,
    end_date: end,

    attractions: attractions.map(
      (attraction) => attraction.get({ plain: true }) as AttractionModelI,
    ),

    reports: reports.map(
      (report) => report.get({ plain: true }) as AttractionReportModelI,
    ),
  });
};

export const GetNotConfirmedAttractionZReportDatesService = async () => {
  const reports = await AttractionReportModel.findAll({
    where: {
      report_type: AttractionReportTypes.ZREPORT,
      status: {
        [Op.ne]: AttractionReportStatusTypes.CONFIRMED,
      },
    },
    attributes: ["report_date"],
    group: ["report_date"],
    order: [["report_date", "DESC"]],
  });

  return reports.map((report) => report.get("report_date"));
};

export const AutoCloseUnclosedAttractionReportsService = async () => {
  const sequelize = AttractionReportModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    const now = new Date();

    const closeableStatuses = [
      AttractionReportStatusTypes.OPEN,
      AttractionReportStatusTypes.STOPPED,
    ];

    const xreports = await AttractionReportModel.findAll({
      where: {
        report_type: AttractionReportTypes.XREPORT,
        status: {
          [Op.in]: closeableStatuses,
        },
        closed_at: null,
      },
      attributes: ["id", "zreport"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (xreports.length === 0) {
      return {
        closed_xreports: 0,
        closed_zreports: 0,
        message: "No unclosed attraction X reports found.",
      };
    }

    const xreportIDs = xreports.map((item) => Number(item.id));

    const [closedXReports] = await AttractionReportModel.update(
      {
        operator: null,
        status: AttractionReportStatusTypes.CLOSED,
        closed_at: now,
      },
      {
        where: {
          id: {
            [Op.in]: xreportIDs,
          },
          report_type: AttractionReportTypes.XREPORT,
          status: {
            [Op.in]: closeableStatuses,
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

    let closedZReports = 0;

    for (const zreportID of zreportIDs) {
      const openedXReportsCount = await AttractionReportModel.count({
        where: {
          zreport: zreportID,
          report_type: AttractionReportTypes.XREPORT,
          status: {
            [Op.in]: closeableStatuses,
          },
          closed_at: null,
        },
        transaction,
      });

      if (openedXReportsCount > 0) {
        continue;
      }

      const zReport = await AttractionReportModel.findOne({
        where: {
          id: zreportID,
          report_type: AttractionReportTypes.ZREPORT,
          status: {
            [Op.in]: closeableStatuses,
          },
          closed_at: null,
        },
        attributes: ["id", "attraction"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!zReport) {
        continue;
      }

      const [updatedZReports] = await AttractionReportModel.update(
        {
          status: AttractionReportStatusTypes.CLOSED,
          closed_at: now,
        },
        {
          where: {
            id: zreportID,
            report_type: AttractionReportTypes.ZREPORT,
            status: {
              [Op.in]: closeableStatuses,
            },
            closed_at: null,
          },
          transaction,
        },
      );

      if (updatedZReports > 0) {
        await AttractionModel.update(
          {
            status: AttractionStatusTypes.INACTIVE,
          },
          {
            where: {
              id: zReport.attraction,
            },
            transaction,
          },
        );
      }

      closedZReports += updatedZReports;
    }

    return {
      closed_xreports: closedXReports,
      closed_zreports: closedZReports,
      message: "Unclosed attraction reports closed successfully.",
    };
  });
};
