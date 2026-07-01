import { Op, Transaction } from "sequelize";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
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
  addAttractionZReportsTotals,
  AttractionReportDTO,
  AttractionReportsTodayDTO,
  AttractionZReportAttractionDTO,
  emptyAttractionZReportsTotals,
} from "../../dtos/attraction-reports-dtos/AttractionReportDto";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { getDateRange, getTodayRange } from "../../utils/date";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
export const OpenAttractionReportService = async (
  operatorID: number,
  params: AttractionReportParams,
) => {
  const attractionID = Number(params.attractionID);

  return await AttractionReportModel.sequelize!.transaction(
    async (transaction) => {
      const { start, end } = getTodayRange();

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
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (operatorAttraction === null) {
        throw NotFound("Operator attraction not found!");
      }

      const openXReport = await AttractionReportModel.findOne({
        where: {
          operator: operatorID,
          report_type: AttractionReportTypes.XREPORT,
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

      if (openXReport !== null) {
        throw Conflict("Operator already has open X report!");
      }

      let zReport = await AttractionReportModel.findOne({
        where: {
          attraction: attractionID,
          report_type: AttractionReportTypes.ZREPORT,
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

      if (zReport === null) {
        const closedTodayZReport = await AttractionReportModel.findOne({
          where: {
            attraction: attractionID,
            report_type: AttractionReportTypes.ZREPORT,
            status: {
              [Op.in]: [
                AttractionReportStatusTypes.CLOSED,
                AttractionReportStatusTypes.CONFIRMED,
              ],
            },
            createdAt: {
              [Op.between]: [start, end],
            },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (closedTodayZReport !== null) {
          throw BadRequest("Today Z report is already closed!");
        }

        zReport = await AttractionReportModel.create(
          {
            attraction: attractionID,
            operator: operatorID,
            report_type: AttractionReportTypes.ZREPORT,
            zreport: null,
            status: AttractionReportStatusTypes.OPEN,
            opened_at: new Date(),
          },
          {
            transaction,
          },
        );
      }

      const xReport = await AttractionReportModel.create(
        {
          attraction: attractionID,
          operator: operatorID,
          report_type: AttractionReportTypes.XREPORT,
          zreport: zReport.id,
          status: AttractionReportStatusTypes.OPEN,
          opened_at: new Date(),
        },
        {
          transaction,
        },
      );

      const reportData = xReport.get({ plain: true });

      return AttractionReportDTO(reportData);
    },
  );
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
  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  if (
    ![
      AttractionReportStatusTypes.STOPPED,
      AttractionReportStatusTypes.CLOSED,
    ].includes(body.status)
  ) {
    throw BadRequest("Invalid report status!");
  }

  return await AttractionReportModel.sequelize!.transaction(
    async (transaction: Transaction) => {
      const operatorAttraction = await AttractionOperatorModel.findOne({
        where: {
          operator: operatorID,
          attraction: attractionID,
          status: AttractionOperatorStatusTypes.ACTIVE,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (operatorAttraction === null) {
        throw NotFound("Operator attraction not found!");
      }

      if (body.status === AttractionReportStatusTypes.STOPPED) {
        const report = await AttractionReportModel.findOne({
          where: {
            operator: operatorID,
            attraction: attractionID,
            status: AttractionReportStatusTypes.OPEN,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (report === null) {
          throw BadRequest("Open report not found!");
        }

        const stoppedAt = new Date();

        await report.update(
          {
            status: AttractionReportStatusTypes.STOPPED,
            stopped_at: stoppedAt,
          },
          {
            transaction,
          },
        );

        const reportData = report.get({ plain: true });

        return AttractionReportDTO({
          ...reportData,
          status: AttractionReportStatusTypes.STOPPED,
          stopped_at: stoppedAt,
        });
      }

      const report = await AttractionReportModel.findOne({
        where: {
          operator: operatorID,
          attraction: attractionID,
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

      if (report === null) {
        throw BadRequest("Open or stopped report not found!");
      }

      const openRound = await AttractionRoundModel.findOne({
        where: {
          report: Number(report.id),
          attraction: attractionID,
          operator: operatorID,
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (openRound !== null && Number(openRound.people_count || 0) > 0) {
        throw BadRequest("Close current round first!");
      }

      if (openRound !== null && Number(openRound.people_count || 0) === 0) {
        await openRound.update(
          {
            status: AttractionRoundStatusTypes.CANCELLED,
            finished_at: new Date(),
          },
          {
            transaction,
          },
        );
      }

      const closedAt = new Date();

      await report.update(
        {
          status: AttractionReportStatusTypes.CLOSED,
          closed_at: closedAt,
        },
        {
          transaction,
        },
      );

      const reportData = report.get({ plain: true });

      return AttractionReportDTO({
        ...reportData,
        status: AttractionReportStatusTypes.CLOSED,
        closed_at: closedAt,
      });
    },
  );
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