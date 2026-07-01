import { Op } from "sequelize";
import {
  AttractionOperatorDTO,
} from "../../dtos/attraction-operators-dtos/AttractionOperatorDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AttractionStatusTypes } from "../../models/postgresql/attraction-model/enums";
import {
  AttractionOperatorStatusTypes,
} from "../../models/postgresql/attraction-operator-model/enums";
import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";
import {
  AttractionModel,
  AttractionOperatorModel,
  EmployeeModel,
  RoleModel,
} from "../../plugins/db/postgresql/db";

export const CreateAttractionOperatorsService = async (
  params: AttractionOperatorParams,
  body: CreateAttractionOperatorData,
): Promise<AttractionOperatorResponseDTO> => {
  const findAttraction = await AttractionModel.findByPk(params.attractionID);

  if (findAttraction === null) {
    throw NotFound("Attraction not found!");
  }

  const employee = await EmployeeModel.findByPk(body.operator);
  if (employee == null) throw NotFound("Employee not found");

  const checkrole = await RoleModel.findByPk(employee.role);
  if (checkrole?.name !== "operator")
    throw BadRequest("Employee is not a operator");

  const findAttractionOperator = await AttractionOperatorModel.findOne({
    where: {
      attraction: params.attractionID,
      operator: body.operator,
      type: body.type,
      status: AttractionOperatorStatusTypes.ACTIVE,
    },
  });

  if (findAttractionOperator !== null)
    throw Conflict("Operator is already actived at this attraction");

  const attractionOperator = await AttractionOperatorModel.create({
    attraction: params.attractionID,
    operator: body.operator,
    type: body.type,
    status: AttractionOperatorStatusTypes.ACTIVE,
  });

  await EmployeeModel.update(
    {
      status: EmployeeStatusTypes.ACTIVE,
    },
    {
      where: {
        id: body.operator,
      },
    },
  );

  const attractionOperators = await AttractionOperatorModel.findByPk(
    attractionOperator.id,
    {
      include: [
        {
          model: EmployeeModel,
          as: "operators",
          attributes: ["id", "firstname", "lastname", "file"],
        },
      ],
    },
  );

  if (!attractionOperators) {
    throw NotFound("Attraction operator not found");
  }

  const attractionData = AttractionOperatorDTO(
    attractionOperators.get({ plain: true }),
  );
  return attractionData;
};

export const DeleteAttractionOperatorsService = async (
  params: AttractionOperatorParams,
) => {
  const attraction = await AttractionModel.findByPk(params.attractionID);

  if (!attraction) {
    throw NotFound("Attraction not found");
  }

  await AttractionOperatorModel.update(
    {
      status: AttractionOperatorStatusTypes.INACTIVE,
    },
    {
      where: {
        attraction: params.attractionID,
        operator: params.operatorID,
      },
    },
  );

  const operators = await AttractionOperatorModel.findAll({
    where: {
      attraction: params.attractionID,
      status: AttractionStatusTypes.ACTIVE,
    },
  });

  if (operators.length === 0) {
    await attraction.update({
      status: AttractionStatusTypes.INACTIVE,
    });
  }

  return true;
};
