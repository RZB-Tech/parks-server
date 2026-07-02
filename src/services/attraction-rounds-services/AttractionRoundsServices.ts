import { Op } from "sequelize";
import { AttractionRoundDTO } from "../../dtos/attraction-rounds-dtos/AttractionRoundDto";
import { BadRequest, NotFound } from "../../exceptions";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../../models/postgresql/attraction-model/enums";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { getTashkentDayRangeUTC } from "../../utils/date";

export const GetCurrentAttractionRoundService = async (
  operatorID: number,
  params: AttractionRoundParams,
) => {
  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const openReport = await AttractionReportModel.findOne({
    where: {
      operator: operatorID,
      attraction: attractionID,
      status: AttractionReportStatusTypes.OPEN,
      report_type: AttractionReportTypes.XREPORT,
    },
  });

  if (openReport === null) {
    return null;
  }

  const round = await AttractionRoundModel.findOne({
    where: {
      report: Number(openReport.id),
      attraction: attractionID,
      operator: operatorID,
      status: AttractionRoundStatusTypes.OPEN,
    },
    order: [["round_number", "DESC"]],
  });

  if (round === null) {
    return null;
  }

  const roundData = round.get({
    plain: true,
  }) as AttractionRoundModelI;

  return AttractionRoundDTO(roundData);
};

export const GetTodayAttractionRoundsService = async (
  operatorID: number,
  params: AttractionRoundParams,
) => {
  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const offset = 5 * 60 * 60 * 1000;
  const now = new Date();
  const tashkentNow = new Date(now.getTime() + offset);

  const year = tashkentNow.getUTCFullYear();
  const month = tashkentNow.getUTCMonth();
  const date = tashkentNow.getUTCDate();

  const start = new Date(Date.UTC(year, month, date, -5, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, date + 1, -5, 0, 0, 0));

  const rounds = await AttractionRoundModel.findAll({
    where: {
      operator: operatorID,
      attraction: attractionID,
      status: {
        [Op.in]: [
          AttractionRoundStatusTypes.OPEN,
          AttractionRoundStatusTypes.FINISHED,
        ],
      },
      started_at: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
    order: [
      ["round_number", "ASC"],
      ["id", "ASC"],
    ],
  });

  const data = rounds.map((round) =>
    round.get({
      plain: true,
    }),
  ) as AttractionRoundModelI[];

  return data.map(AttractionRoundDTO);
};
export const GetTodayRoundsService = async () => {
  const { startDate, endDate } = getTashkentDayRangeUTC();

  const rounds = await AttractionRoundModel.findAll({
    where: {
      status: {
        [Op.in]: [
          AttractionRoundStatusTypes.OPEN,
          AttractionRoundStatusTypes.FINISHED,
        ],
      },
      started_at: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
    },
    include: [
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
      },
      {
        model: AttractionModel,
        as: "attractions",
        required: false,
      },
    ],
    order: [
      ["round_number", "ASC"],
      ["id", "ASC"],
    ],
  });

  const data = rounds.map(
    (round) =>
      round.get({
        plain: true,
      }) as AttractionRoundWithRelationsPlain,
  );

  return data.map(AttractionRoundDTO);
};

export const CloseCurrentAttractionRoundService = async (
  operatorID: number,
  params: AttractionRoundParams,
) => {
  return await AttractionRoundModel.sequelize!.transaction(
    async (transaction) => {
      const round = await AttractionRoundModel.findOne({
        where: {
          id: params.roundID,
          operator: operatorID,
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (round === null) {
        throw BadRequest("Open round not found!");
      }

      const attractionID = Number(round.attraction);

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
            attributes: ["id", "duration"],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (operatorAttraction === null) {
        throw NotFound("Operator attraction not found!");
      }

      const operatorAttractionData = operatorAttraction.get({
        plain: true,
      }) as AttractionOperatorModelI & {
        attractions: {
          id: number | string;
          duration: number | string;
        };
      };

      const xReport = await AttractionReportModel.findOne({
        where: {
          id: Number(round.report),
          operator: operatorID,
          attraction: attractionID,
          report_type: AttractionReportTypes.XREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (xReport === null) {
        throw BadRequest("Open X report required!");
      }

      if (!xReport.zreport) {
        throw BadRequest("X report is not connected to Z report!");
      }

      const zReport = await AttractionReportModel.findOne({
        where: {
          id: Number(xReport.zreport),
          attraction: attractionID,
          report_type: AttractionReportTypes.ZREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (zReport === null) {
        throw BadRequest("Open Z report required!");
      }

      const peopleCount = Number(round.people_count || 0);

      if (peopleCount <= 0) {
        throw BadRequest("Round has no people!");
      }

      const duration = Number(operatorAttractionData.attractions.duration || 0);

      const startedAt = new Date(round.started_at);

      const finishedAt =
        duration > 0
          ? new Date(startedAt.getTime() + duration * 60 * 1000)
          : new Date();

      await round.update(
        {
          status: AttractionRoundStatusTypes.FINISHED,
          finished_at: finishedAt,
        },
        {
          transaction,
        },
      );

      const reportIncrementData = {
        total_rounds: 1,
        total_people: Number(round.people_count || 0),
        total_offline: Number(round.offline_count || 0),
        total_online: Number(round.online_count || 0),
        total_vip: Number(round.vip_count || 0),
        total_guest: Number(round.guest_count || 0),
        total_park_staff: Number(round.park_staff_count || 0),
        paid_amount: Number(round.paid_amount || 0),
        total_amount: Number(round.total_amount || 0),
      };

      await xReport.increment(reportIncrementData, {
        transaction,
      });

      await zReport.increment(reportIncrementData, {
        transaction,
      });

      const roundData = round.get({
        plain: true,
      }) as AttractionRoundModelI;

      return AttractionRoundDTO({
        ...roundData,
        status: AttractionRoundStatusTypes.FINISHED,
        finished_at: finishedAt,
      });
    },
  );
};
