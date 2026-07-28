import { col, fn, literal, Op, QueryTypes, Transaction } from "sequelize";
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
  addPromotionToAttractionZReportsTotals,
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
import { PromotionReportModel, sequelize } from "../../plugins/db/postgresql/db";

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
) => {
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

  const zreportID = Number(report.zreport);

  if (!Number.isInteger(zreportID) || zreportID <= 0) {
    throw BadRequest("Open Z report required!");
  }

  /*
   * Bitta Z-report ichida bir nechta operator bir vaqtda round
   * ochishi mumkin. Z-reportni lock qilish round_number ketma-ketligini
   * shu kun uchun atomik saqlaydi.
   */
  const zReport = await AttractionReportModel.findOne({
    where: {
      id: zreportID,
      attraction: attractionID,
      report_type: AttractionReportTypes.ZREPORT,
      status: AttractionReportStatusTypes.OPEN,
    },
    attributes: ["id"],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!zReport) {
    throw BadRequest("Open Z report required!");
  }

  /*
   * Bir xil operator/clientdan parallel request kelgan bo‘lsa,
   * Z-report lock olingandan keyin OPEN roundni qayta tekshiramiz.
   */
  const lockedOpenRound = await AttractionRoundModel.findOne({
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

  if (lockedOpenRound !== null) {
    return lockedOpenRound;
  }

  const zReportXReports = await AttractionReportModel.findAll({
    where: {
      attraction: attractionID,
      report_type: AttractionReportTypes.XREPORT,
      zreport: zreportID,
    },
    attributes: ["id"],
    transaction,
  });

  const zReportXReportIDs = zReportXReports.map((item) => Number(item.id));

  const lastRound = await AttractionRoundModel.findOne({
    where: {
      attraction: attractionID,
      report: {
        [Op.in]: zReportXReportIDs,
      },
    },
    order: [["round_number", "DESC"]],
    transaction,
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

      [AttractionReportStatusTypes.CLOSED]: [AttractionReportStatusTypes.OPEN],
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

    /*
     * X yoki Z report STOPPED bo‘lsa attraction STOPPED bo‘ladi.
     */
    if (body.status === AttractionReportStatusTypes.STOPPED) {
      await attraction.update(
        {
          status: AttractionStatusTypes.STOPPED,
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
  query: GetAttractionReportsQuery = {},
) => {
  const normalizedOperatorID = Number(operatorID);

  if (!Number.isInteger(normalizedOperatorID) || normalizedOperatorID <= 0) {
    throw BadRequest("Operator is required!");
  }

  const attractionID = Number(params.attractionID);

  if (!Number.isInteger(attractionID) || attractionID <= 0) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const { start, end } = getDateRange(query.date);

  const [zReport, xReports] = await Promise.all([
    AttractionReportModel.findOne({
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
    }),

    AttractionReportModel.findAll({
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
    }),
  ]);

  const xReportIDs = xReports.map((report) => Number(report.id));

  const [xPromotionReports, zPromotionReports] = await Promise.all([
    xReportIDs.length
      ? PromotionReportModel.findAll({
          where: {
            xreport: {
              [Op.in]: xReportIDs,
            },
          },

          order: [
            ["discount_percent", "DESC"],
            ["promotion", "DESC"],
          ],
        })
      : Promise.resolve([]),

    zReport
      ? PromotionReportModel.findAll({
          where: {
            zreport: Number(zReport.id),
          },

          attributes: [
            "promotion",
            "promotion_key",
            "promotion_code",
            "promotion_name",
            "promotion_type",
            "promotion_started_at",
            "promotion_ended_at",
            "discount_percent",
            "original_unit_price",
            "sale_unit_price",
            [fn("SUM", col("rounds_count")), "rounds_count"],
            [fn("SUM", col("total_people")), "total_people"],
            [fn("SUM", col("total_virtual")), "total_virtual"],
            [fn("SUM", col("total_classic")), "total_classic"],
            [fn("SUM", col("total_vip")), "total_vip"],
            [fn("SUM", col("total_organization")), "total_organization"],
            [fn("SUM", col("total_online")), "total_online"],
            [fn("SUM", col("total_offline")), "total_offline"],
            [fn("SUM", col("original_amount")), "original_amount"],
            [fn("SUM", col("discount_amount")), "discount_amount"],
            [fn("SUM", col("total_amount")), "total_amount"],
            [fn("SUM", col("paid_amount")), "paid_amount"],
          ],

          group: [
            "promotion",
            "promotion_key",
            "promotion_code",
            "promotion_name",
            "promotion_type",
            "promotion_started_at",
            "promotion_ended_at",
            "discount_percent",
            "original_unit_price",
            "sale_unit_price",
          ],

          order: [
            ["discount_percent", "DESC"],
            ["promotion_started_at", "ASC"],
          ],

          raw: true,
        })
      : Promise.resolve([]),
  ]);

  const promotionReportsByXReport = new Map<number, PromotionReportPlain[]>();

  for (const report of xPromotionReports) {
    const plain = report.get({
      plain: true,
    }) as PromotionReportPlain;

    const xreportID = Number(report.xreport);
    const current = promotionReportsByXReport.get(xreportID) ?? [];

    current.push(plain);
    promotionReportsByXReport.set(xreportID, current);
  }

  const zReportPlain = zReport
    ? ({
        ...(zReport.get({
          plain: true,
        }) as AttractionReportWithOperatorPlain),

        promotion_reports: zPromotionReports as PromotionReportPlain[],
      } satisfies AttractionReportWithOperatorPlain)
    : null;

  const xReportsPlain = xReports.map((report) => {
    const plain = report.get({
      plain: true,
    }) as AttractionReportWithOperatorPlain;

    return {
      ...plain,

      promotion_reports: promotionReportsByXReport.get(Number(report.id)) ?? [],
    };
  });

  return AttractionReportsTodayDTO({
    zreport: zReportPlain,
    xreports: xReportsPlain,
  });
};

export const GetAttractionZReportsService = async (
  query: GetAttractionZReportsQuery,
) => {
  const { start, end } = getDateRange(query.date);
  const requestedPromotionCodes = [
    ...new Set(
      (Array.isArray(query.promotion_codes)
        ? query.promotion_codes
        : query.promotion_codes
          ? [query.promotion_codes]
          : []
      )
        .flatMap((code) => code.split(","))
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];
  const search = query.search?.trim() ?? "";

  const baseReportWhere = {
    report_type: AttractionReportTypes.ZREPORT,

    createdAt: {
      [Op.between]: [start, end],
    },
  };

  const allReports = await AttractionReportModel.findAll({
    where: baseReportWhere,

    order: [
      ["attraction", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  let allReportsPlain = allReports.map(
    (report) =>
      report.get({
        plain: true,
      }) as AttractionReportModelI,
  );

  const zReportIDs = allReportsPlain.map((report) => Number(report.id));

  const allPromotionReports = zReportIDs.length
    ? await PromotionReportModel.findAll({
        where: {
          zreport: {
            [Op.in]: zReportIDs,
          },
        },

        attributes: [
          "zreport",

            "promotion",
            "promotion_key",

            "promotion_code",
            "promotion_name",
            "promotion_type",

            "discount_percent",

            "original_unit_price",
            "sale_unit_price",

            [fn("SUM", col("rounds_count")), "rounds_count"],

            [fn("SUM", col("total_people")), "total_people"],

            [fn("SUM", col("total_virtual")), "total_virtual"],

            [fn("SUM", col("total_classic")), "total_classic"],

            [fn("SUM", col("total_vip")), "total_vip"],

            [fn("SUM", col("total_organization")), "total_organization"],

            [fn("SUM", col("total_online")), "total_online"],

            [fn("SUM", col("total_offline")), "total_offline"],

            [fn("SUM", col("original_amount")), "original_amount"],

            [fn("SUM", col("discount_amount")), "discount_amount"],

            [fn("SUM", col("total_amount")), "total_amount"],

            [fn("SUM", col("paid_amount")), "paid_amount"],
          ],

          group: [
            "zreport",

            "promotion",
            "promotion_key",

            "promotion_code",
            "promotion_name",
            "promotion_type",

            "discount_percent",

            "original_unit_price",
            "sale_unit_price",
          ],

          order: [
            ["zreport", "DESC"],

            ["discount_percent", "DESC"],
          ],

        raw: true,
      })
    : [];
  const promotionReports = requestedPromotionCodes.length
    ? allPromotionReports.filter(
        (report) =>
          typeof report.promotion_code === "string" &&
          requestedPromotionCodes.includes(report.promotion_code),
      )
    : allPromotionReports;

  let attractions = await AttractionModel.findAll({
    where: search
      ? {
          name: {
            [Op.iLike]: `%${search}%`,
          },
        }
      : undefined,
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

  if (search) {
    const searchedAttractionIDs = new Set(
      attractions.map((attraction) => Number(attraction.id)),
    );

    allReportsPlain = allReportsPlain.filter((report) =>
      searchedAttractionIDs.has(Number(report.attraction)),
    );
  }

  const promotionCodeScopeZReportIDs = new Set(
    allReportsPlain.map((report) => Number(report.id)),
  );

  if (requestedPromotionCodes.length) {
    const matchedZReportIDs = new Set(
      promotionReports.map((report) => Number(report.zreport)),
    );

    allReportsPlain = allReportsPlain.filter((report) =>
      matchedZReportIDs.has(Number(report.id)),
    );

    const matchedAttractionIDs = new Set(
      allReportsPlain.map((report) => Number(report.attraction)),
    );

    attractions = attractions.filter((attraction) =>
      matchedAttractionIDs.has(Number(attraction.id)),
    );
  }

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

    if (!requestedPromotionCodes.length) {
      addAttractionZReportsTotals(totals, report);
    }

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

  const promotionReportsByZReport = new Map<number, PromotionReportPlain[]>();
  const filteredZReportIDs = new Set(
    allReportsPlain.map((report) => Number(report.id)),
  );
  const usedPromotionCodes = [
    ...new Set(
      allPromotionReports
        .filter((report) =>
          promotionCodeScopeZReportIDs.has(Number(report.zreport)),
        )
        .map((report) => report.promotion_code?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ].sort((first, second) => first.localeCompare(second));

  if (requestedPromotionCodes.length) {
    for (const report of promotionReports) {
      if (filteredZReportIDs.has(Number(report.zreport))) {
        addPromotionToAttractionZReportsTotals(
          totals,
          report as PromotionReportPlain,
        );
      }
    }
  }

  for (const report of promotionReports) {
    const plain = report as PromotionReportPlain;

    const zreportID = Number(plain.zreport);

    const current = promotionReportsByZReport.get(zreportID) ?? [];

    current.push(plain);

    promotionReportsByZReport.set(zreportID, current);
  }

  return {
    promotion_codes: usedPromotionCodes,
    stats,
    totals,

    attractions: attractions.map((attraction) => {
      const plain = attraction.get({
        plain: true,
      }) as AttractionWithZReportsPlain;

      const reports = Array.isArray(plain.reports)
        ? plain.reports
            .filter((report) => filteredZReportIDs.has(Number(report.id)))
            .map((report) => ({
              ...report,
              promotion_reports:
                promotionReportsByZReport.get(Number(report.id)) ?? [],
            }))
        : [];

      return AttractionZReportAttractionDTO({
        ...plain,
        reports,
      }, requestedPromotionCodes.length > 0);
    }),
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
    const bodyZReportIDs = body.zreports.map((report) => Number(report.id));

    const uniqueBodyIDs = new Set(bodyZReportIDs);

    if (
      bodyZReportIDs.some(
        (reportID) => !Number.isInteger(reportID) || reportID <= 0,
      )
    ) {
      throw BadRequest("Invalid Z report ids sent!");
    }

    if (uniqueBodyIDs.size !== bodyZReportIDs.length) {
      throw BadRequest("Duplicate Z report ids are not allowed!");
    }

    const selectedZReports = await AttractionReportModel.findAll({
      where: {
        id: {
          [Op.in]: bodyZReportIDs,
        },
        report_type: AttractionReportTypes.ZREPORT,
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (selectedZReports.length !== uniqueBodyIDs.size) {
      throw BadRequest("Invalid Z report ids sent!");
    }

    for (const zReport of selectedZReports) {
      if (
        [
          AttractionReportStatusTypes.OPEN,
          AttractionReportStatusTypes.STOPPED,
        ].includes(zReport.status)
      ) {
        throw BadRequest("Z report must be closed first!");
      }

      if (zReport.status === AttractionReportStatusTypes.CONFIRMED) {
        throw BadRequest("Z report is already confirmed!");
      }

      if (zReport.status !== AttractionReportStatusTypes.CLOSED) {
        throw BadRequest("Invalid Z report status!");
      }
    }

    const [updatedReportsCount] = await AttractionReportModel.update(
      {
        status: AttractionReportStatusTypes.CONFIRMED,
        confirmed_by: operatorID,
        confirmed_at: new Date(),
      },
      {
        where: {
          id: {
            [Op.in]: bodyZReportIDs,
          },
          report_type: AttractionReportTypes.ZREPORT,
          status: AttractionReportStatusTypes.CLOSED,
        },
        transaction: dbTransaction,
      },
    );

    if (updatedReportsCount !== uniqueBodyIDs.size) {
      throw Conflict("Some Z report statuses were changed. Try again!");
    }

    return true;
  });
};


export const GetAccountingAttractionReportsService = async (
  query: GetAccountingAttractionReportsQuery,
): Promise<AccountingAttractionReportsResponseDTO> => {
  const { start, end } = getAccountingDateRange(query);

  const promotionCode =
    typeof query.promotion_code === "string" ? query.promotion_code.trim() : "";
  const requestedPromotionCodes = [
    ...new Set(
      [
        ...(Array.isArray(query.promotion_codes)
          ? query.promotion_codes
          : query.promotion_codes
            ? [query.promotion_codes]
            : []),
        ...(promotionCode ? [promotionCode] : []),
      ]
        .flatMap((code) => code.split(","))
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];

  /*
   * Faqat CONFIRMED ZReportlar.
   */
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

  const reportsPlain = reports.map(
    (report) =>
      report.get({
        plain: true,
      }) as AttractionReportModelI,
  );

  const zreportIDs = reportsPlain.map((report) => Number(report.id));

  /*
   * Faqat CONFIRMED ZReportlarga tegishli
   * promotion reportlar olinadi.
   *
   * promotion_code yuborilsa faqat shu aksiya.
   * Yuborilmasa barcha aksiyalar va aksiyasiz
   * paymentlar ham olinadi.
   */
  const allPromotionReports = zreportIDs.length
    ? await PromotionReportModel.findAll({
        where: {
          zreport: {
            [Op.in]: zreportIDs,
          },
        },

        attributes: [
          "attraction",

          "promotion",
          "promotion_key",

          "promotion_code",
          "promotion_name",
          "promotion_type",

          "discount_percent",

          "original_unit_price",
          "sale_unit_price",

          [fn("SUM", col("rounds_count")), "rounds_count"],

          [fn("SUM", col("total_people")), "total_people"],

          [fn("SUM", col("total_virtual")), "total_virtual"],

          [fn("SUM", col("total_classic")), "total_classic"],

          [fn("SUM", col("total_vip")), "total_vip"],

          [fn("SUM", col("total_organization")), "total_organization"],

          [fn("SUM", col("total_online")), "total_online"],

          [fn("SUM", col("total_offline")), "total_offline"],

          [fn("SUM", col("original_amount")), "original_amount"],

          [fn("SUM", col("discount_amount")), "discount_amount"],

          [fn("SUM", col("total_amount")), "total_amount"],

          [fn("SUM", col("paid_amount")), "paid_amount"],
        ],

        group: [
          "attraction",

          "promotion",
          "promotion_key",

          "promotion_code",
          "promotion_name",
          "promotion_type",

          "discount_percent",

          "original_unit_price",
          "sale_unit_price",
        ],

        order: [
          ["attraction", "ASC"],
          ["discount_percent", "DESC"],
          ["promotion_name", "ASC"],
        ],

        raw: true,
      })
    : [];
  const promotionReports = requestedPromotionCodes.length
    ? allPromotionReports.filter(
        (report) =>
          typeof report.promotion_code === "string" &&
          requestedPromotionCodes.includes(report.promotion_code),
      )
    : allPromotionReports;

  const promotionReportsPlain =
    promotionReports as unknown as PromotionReportPlain[];
  const availablePromotionCodes = [
    ...new Set(
      allPromotionReports
        .map((report) => report.promotion_code?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ].sort((first, second) => first.localeCompare(second));

  /*
   * promotion_code filter bo‘lsa faqat shu aksiya
   * ishlatilgan attractionlar qaytadi.
   *
   * Filter bo‘lmasa confirmed ZReport mavjud
   * attractionlar qaytadi.
   */
  const attractionIDs = requestedPromotionCodes.length
    ? [
        ...new Set(
          promotionReportsPlain.map((report) => Number(report.attraction)),
        ),
      ]
    : [...new Set(reportsPlain.map((report) => Number(report.attraction)))];

  const attractions = attractionIDs.length
    ? await AttractionModel.findAll({
        where: {
          id: {
            [Op.in]: attractionIDs,
          },
        },

        order: [["id", "ASC"]],
      })
    : [];

  const selectedAttractionIDs = new Set(attractionIDs);

  /*
   * Filter ishlatilganda faqat topilgan
   * attractionlarning ZReportlari totalsga kiradi.
   */
  const selectedReports = reportsPlain.filter((report) =>
    selectedAttractionIDs.has(Number(report.attraction)),
  );

  return AccountingAttractionReportsDTO({
    start_date: start,
    end_date: end,

    promotion_code: promotionCode || null,
    promotion_codes: availablePromotionCodes,
    promotion_only: requestedPromotionCodes.length > 0,

    attractions: attractions.map(
      (attraction) =>
        attraction.get({
          plain: true,
        }) as AttractionModelI,
    ),

    reports: selectedReports,

    promotion_reports: promotionReportsPlain,
  });
};

export const GetNotConfirmedAttractionZReportDatesService = async () => {
  const reports = await sequelize.query<{ report_date: string }>(
    `
      SELECT DISTINCT
        DATE(opened_at AT TIME ZONE 'Asia/Tashkent') AS report_date
      FROM attraction_reports
      WHERE deleted_at IS NULL
        AND report_type = :reportType
        AND status != :confirmedStatus
      ORDER BY report_date DESC
    `,
    {
      replacements: {
        reportType: AttractionReportTypes.ZREPORT,
        confirmedStatus: AttractionReportStatusTypes.CONFIRMED,
      },
      type: QueryTypes.SELECT,
    },
  );

  return reports.map((report) => report.report_date);
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
