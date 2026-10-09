import { Op, Transaction } from "sequelize";
import { BadRequest, NotFound } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../../models/postgresql/attraction-model/enums";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../../models/postgresql/cashbox-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { FinalizeAttractionRoundService } from "../attraction-rounds-services/AttractionRoundsServices";

export type ForceCloseReportSource = "cashbox" | "attraction";

export type ForceCloseReportsResult = {
  source: ForceCloseReportSource;
  source_id: number;
  closed_xreports: number;
  closed_zreports: number;
  finalized_rounds: number;
  target_status: CashboxStatusTypes.CLOSED | AttractionStatusTypes.INACTIVE;
  closed_at: string;
};

const cashboxCloseableStatuses = [
  CashboxReportStatusTypes.OPEN,
  CashboxReportStatusTypes.STOPPED,
];

const attractionCloseableStatuses = [
  AttractionReportStatusTypes.OPEN,
  AttractionReportStatusTypes.STOPPED,
];

const validateSourceID = (sourceID: number) => {
  if (!Number.isInteger(sourceID) || sourceID <= 0) {
    throw BadRequest("Source ID is invalid!");
  }
};

export const ForceCloseCashboxReportsService = async (
  cashboxID: number,
): Promise<ForceCloseReportsResult> => {
  validateSourceID(cashboxID);

  const sequelize = CashboxReportModel.sequelize!;

  return sequelize.transaction(async (transaction: Transaction) => {
    const cashbox = await CashboxModel.findByPk(cashboxID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!cashbox) {
      throw NotFound("Cashbox not found!");
    }

    if (cashbox.type === CashboxTypes.VIRTUAL) {
      throw BadRequest("VIRTUAL_CASHBOX_OPERATION_NOT_ALLOWED");
    }

    const now = new Date();
    const reports = await CashboxReportModel.findAll({
      where: {
        cashbox: cashboxID,
        report_type: {
          [Op.in]: [CashboxReportTypes.XREPORT, CashboxReportTypes.ZREPORT],
        },
        status: {
          [Op.in]: cashboxCloseableStatuses,
        },
      },
      attributes: ["id", "report_type"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const xreportIDs = reports
      .filter((report) => report.report_type === CashboxReportTypes.XREPORT)
      .map((report) => Number(report.id));
    const zreportIDs = reports
      .filter((report) => report.report_type === CashboxReportTypes.ZREPORT)
      .map((report) => Number(report.id));

    let closedXReports = 0;
    let closedZReports = 0;

    if (xreportIDs.length > 0) {
      [closedXReports] = await CashboxReportModel.update(
        {
          status: CashboxReportStatusTypes.CLOSED,
          closed_at: now,
        },
        {
          where: {
            id: { [Op.in]: xreportIDs },
            cashbox: cashboxID,
            report_type: CashboxReportTypes.XREPORT,
            status: { [Op.in]: cashboxCloseableStatuses },
          },
          transaction,
        },
      );
    }

    if (zreportIDs.length > 0) {
      [closedZReports] = await CashboxReportModel.update(
        {
          status: CashboxReportStatusTypes.CLOSED,
          closed_at: now,
        },
        {
          where: {
            id: { [Op.in]: zreportIDs },
            cashbox: cashboxID,
            report_type: CashboxReportTypes.ZREPORT,
            status: { [Op.in]: cashboxCloseableStatuses },
          },
          transaction,
        },
      );
    }

    await cashbox.update(
      { status: CashboxStatusTypes.CLOSED },
      { transaction },
    );

    return {
      source: "cashbox",
      source_id: cashboxID,
      closed_xreports: closedXReports,
      closed_zreports: closedZReports,
      finalized_rounds: 0,
      target_status: CashboxStatusTypes.CLOSED,
      closed_at: now.toISOString(),
    };
  });
};

export const ForceCloseAttractionReportsService = async (
  attractionID: number,
): Promise<ForceCloseReportsResult> => {
  validateSourceID(attractionID);

  const sequelize = AttractionReportModel.sequelize!;

  return sequelize.transaction(async (transaction: Transaction) => {
    const attraction = await AttractionModel.findByPk(attractionID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!attraction) {
      throw NotFound("Attraction not found!");
    }

    const now = new Date();
    const reports = await AttractionReportModel.findAll({
      where: {
        attraction: attractionID,
        report_type: {
          [Op.in]: [
            AttractionReportTypes.XREPORT,
            AttractionReportTypes.ZREPORT,
          ],
        },
        status: {
          [Op.in]: attractionCloseableStatuses,
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const xreports = reports.filter(
      (report) => report.report_type === AttractionReportTypes.XREPORT,
    );
    const activeZReports = reports.filter(
      (report) => report.report_type === AttractionReportTypes.ZREPORT,
    );
    const xreportIDs = xreports.map((report) => Number(report.id));
    const zreportIDs = activeZReports.map((report) => Number(report.id));
    let finalizedRounds = 0;

    if (xreportIDs.length > 0) {
      const openRounds = await AttractionRoundModel.findAll({
        where: {
          attraction: attractionID,
          report: { [Op.in]: xreportIDs },
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const activeZReportsByID = new Map(
        activeZReports.map((report) => [Number(report.id), report]),
      );
      const missingParentZReportIDs = [
        ...new Set(
          xreports
            .map((report) => Number(report.zreport))
            .filter(
              (id) =>
                Number.isInteger(id) &&
                id > 0 &&
                !activeZReportsByID.has(id),
            ),
        ),
      ];

      const missingParentZReports = missingParentZReportIDs.length
        ? await AttractionReportModel.findAll({
            where: {
              id: { [Op.in]: missingParentZReportIDs },
              attraction: attractionID,
              report_type: AttractionReportTypes.ZREPORT,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : [];

      const xreportsByID = new Map(
        xreports.map((report) => [Number(report.id), report]),
      );
      const parentZReportsByID = new Map([
        ...activeZReportsByID,
        ...missingParentZReports.map(
          (report) => [Number(report.id), report] as const,
        ),
      ]);

      for (const round of openRounds) {
        const xreport = xreportsByID.get(Number(round.report));
        const zreport = xreport
          ? parentZReportsByID.get(Number(xreport.zreport))
          : undefined;

        if (!xreport || !zreport) {
          await round.update(
            {
              status:
                Number(round.people_count || 0) > 0
                  ? AttractionRoundStatusTypes.FINISHED
                  : AttractionRoundStatusTypes.CANCELLED,
              finished_at: now,
            },
            { transaction },
          );
          finalizedRounds += 1;
          continue;
        }

        await FinalizeAttractionRoundService({
          round,
          xReport: xreport,
          zReport: zreport,
          attractionDuration: attraction.duration,
          transaction,
          emptyRoundAction: "cancel",
          finishedAt: now,
        });
        finalizedRounds += 1;
      }
    }

    let closedXReports = 0;
    let closedZReports = 0;

    if (xreportIDs.length > 0) {
      [closedXReports] = await AttractionReportModel.update(
        {
          status: AttractionReportStatusTypes.CLOSED,
          closed_at: now,
        },
        {
          where: {
            id: { [Op.in]: xreportIDs },
            attraction: attractionID,
            report_type: AttractionReportTypes.XREPORT,
            status: { [Op.in]: attractionCloseableStatuses },
          },
          transaction,
        },
      );
    }

    if (zreportIDs.length > 0) {
      [closedZReports] = await AttractionReportModel.update(
        {
          status: AttractionReportStatusTypes.CLOSED,
          closed_at: now,
        },
        {
          where: {
            id: { [Op.in]: zreportIDs },
            attraction: attractionID,
            report_type: AttractionReportTypes.ZREPORT,
            status: { [Op.in]: attractionCloseableStatuses },
          },
          transaction,
        },
      );
    }

    await attraction.update(
      { status: AttractionStatusTypes.INACTIVE },
      { transaction },
    );

    return {
      source: "attraction",
      source_id: attractionID,
      closed_xreports: closedXReports,
      closed_zreports: closedZReports,
      finalized_rounds: finalizedRounds,
      target_status: AttractionStatusTypes.INACTIVE,
      closed_at: now.toISOString(),
    };
  });
};

export const ForceCloseReportsService = async (
  params: ForceCloseReportsParams,
): Promise<ForceCloseReportsResult> => {
  const sourceID = Number(params.sourceID);

  if (params.source === "cashbox") {
    return ForceCloseCashboxReportsService(sourceID);
  }

  if (params.source === "attraction") {
    return ForceCloseAttractionReportsService(sourceID);
  }

  throw BadRequest("Invalid report source!");
};
