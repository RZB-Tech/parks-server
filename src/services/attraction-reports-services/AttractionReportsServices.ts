import { Op, Transaction } from "sequelize";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { AttractionStatusTypes } from "../../models/postgresql/attraction-model/enums";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionReportDTO } from "../../dtos/attraction-reports-dtos/AttractionReportDto";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";

export const OpenAttractionReportService = async (
  operatorID: number,
  params: AttractionReportParams,
) => {
  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  return await AttractionReportModel.sequelize!.transaction(
    async (transaction) => {
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

      const openReport = await AttractionReportModel.findOne({
        where: {
          operator: operatorID,
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

      if (openReport !== null) {
        throw Conflict("Operator already has open report!");
      }

      const report = await AttractionReportModel.create(
        {
          attraction: attractionID,
          operator: operatorID,
          status: AttractionReportStatusTypes.OPEN,
          opened_at: new Date(),
        },
        {
          transaction,
        },
      );

      const reportData = report.get({ plain: true });

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
): Promise<AttractionReportDto> => {
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
