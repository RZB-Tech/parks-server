import { Op } from "sequelize";
import { BadRequest, NotFound } from "../../exceptions";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { CashboxOperatorModel } from "../../models/postgresql/cashbox-operator-model/CashboxOperatorModel";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import { SosModel } from "../../models/postgresql/sos-model/SosModel";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";
import { SOSReportDTO } from "../../dtos/sos-dtos/SosDto";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionReportTypes } from "../../models/postgresql/attraction-model/enums";


export const CreateSOSService = async (
  operatorID: number,
  params: SosParams,
  body: CreateSOSData,
) => {
  if (!operatorID || Number.isNaN(Number(operatorID))) {
    throw BadRequest("Operator ID is invalid!");
  }

  const sourceID = Number(params.sourceID);

  if (!sourceID || Number.isNaN(sourceID)) {
    throw BadRequest("Source ID is invalid!");
  }

  const allowedSources: SosParams["source"][] = ["attraction", "cashbox"];

  if (!allowedSources.includes(params.source)) {
    throw BadRequest("SOS source is invalid!");
  }

  const description = body.description?.trim();

  if (!description) {
    throw BadRequest("Description is required!");
  }

  if (description.length > 2000) {
    throw BadRequest("Description must not contain more than 2000 characters!");
  }

  return SosModel.sequelize!.transaction(async (transaction) => {
    let attractionOperatorID: number | null = null;
    let cashboxOperatorID: number | null = null;
    let directOperatorID: number | null = null;
    let attractionID: number | null = null;

    if (params.source === "attraction") {
      const attraction = await AttractionModel.findByPk(sourceID, {
        attributes: ["id"],
        transaction,
      });

      if (!attraction) {
        throw NotFound("Attraction not found!");
      }

      const openReport = await AttractionReportModel.findOne({
        where: {
          operator: operatorID,
          attraction: sourceID,
          report_type: AttractionReportTypes.XREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        attributes: ["id"],
        transaction,
      });

      if (!openReport) {
        throw NotFound("Open attraction report not found!");
      }

      directOperatorID = operatorID;
      attractionID = sourceID;
    }

    if (params.source === "cashbox") {
      const cashboxOperator = await CashboxOperatorModel.findOne({
        where: {
          operator: operatorID,
          cashbox: sourceID,
          status: CashboxOperatorStatusTypes.ACTIVE,
        },
        transaction,
      });

      if (!cashboxOperator) {
        throw NotFound("Active cashbox operator assignment not found!");
      }

      cashboxOperatorID = Number(cashboxOperator.id);
    }

    const sos = await SosModel.create(
      {
        attraction_operator: attractionOperatorID,
        cashbox_operator: cashboxOperatorID,
        operator: directOperatorID,
        attraction: attractionID,
        description,
      },
      {
        transaction,
      },
    );

    const createdSOS = await SosModel.findByPk(sos.id, {
      include: [
        {
          model: AttractionOperatorModel,
          as: "attractionOperator",
          required: false,
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
        },
        {
          model: CashboxOperatorModel,
          as: "cashboxOperator",
          required: false,
          include: [
            {
              model: EmployeeModel,
              as: "operators",
              required: false,
            },
            {
              model: CashboxModel,
              as: "cashboxes",
              required: false,
            },
          ],
        },
        {
          model: EmployeeModel,
          as: "directOperator",
          required: false,
        },
        {
          model: AttractionModel,
          as: "directAttraction",
          required: false,
        },
      ],
      transaction,
    });

    if (!createdSOS) {
      throw NotFound("Created SOS report not found!");
    }

    return SOSReportDTO(
      createdSOS.get({
        plain: true,
      }) as SOSReportWithRelationsDTO,
    );
  });
};

export const GetSOSReportsService = async (query: GetSOSReportsQuery) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const allowedSources = ["attraction", "cashbox"];

  if (query.source && !allowedSources.includes(query.source)) {
    throw BadRequest("Invalid SOS source!");
  }

  const search = query.search?.trim();

  const { rows, count } = await SosModel.findAndCountAll({
    where: {
      ...(query.source === "attraction" && {
        [Op.or]: [
          { attraction: { [Op.not]: null } },
          { attraction_operator: { [Op.not]: null } },
        ],
      }),

      ...(query.source === "cashbox" && {
        cashbox_operator: {
          [Op.not]: null,
        },
      }),

      ...(search && {
        description: {
          [Op.iLike]: `%${search}%`,
        },
      }),
    },

    include: [
      {
        model: AttractionOperatorModel,
        as: "attractionOperator",
        include: [
          {
            model: EmployeeModel,
            as: "operators",
          },
          {
            model: AttractionModel,
            as: "attractions",
          },
        ],
      },

      {
        model: CashboxOperatorModel,
        as: "cashboxOperator",
        include: [
          {
            model: EmployeeModel,
            as: "operators",
          },
          {
            model: CashboxModel,
            as: "cashboxes",
          },
        ],
      },
      {
        model: EmployeeModel,
        as: "directOperator",
        required: false,
      },
      {
        model: AttractionModel,
        as: "directAttraction",
        required: false,
      },
    ],

    limit,
    offset,
    distinct: true,
    order: [["created_at", "DESC"]],
  });

  return {
    reports: rows.map((report) =>
      SOSReportDTO(
        report.get({
          plain: true,
        }) as SOSReportWithRelationsDTO,
      ),
    ),

    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
    },
  };
};
