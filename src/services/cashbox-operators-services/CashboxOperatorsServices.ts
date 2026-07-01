import { AttractionOperatorDTO } from "../../dtos/attraction-operators-dtos/AttractionOperatorDto";
import {
  CashboxOperatorByEmployeeDTO,
  CashboxOperatorDTO,
} from "../../dtos/cashbox-operators-dtos/CashboxOperatorDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";
import {
  CashboxModel,
  CashboxOperatorModel,
  EmployeeModel,
  RoleModel,
} from "../../plugins/db/postgresql/db";

export const CreateCashboxOperatorsService = async (
  params: CashboxOperatorParams,
  body: CreateCashboxOperatorData,
): Promise<CashboxOperatorResponseDTO> => {
  const findCashbox = await CashboxModel.findByPk(params.cashboxID);

  if (findCashbox === null) {
    throw NotFound("Cashbox not found!");
  }

  const employee = await EmployeeModel.findByPk(body.operator);
  if (employee == null) throw NotFound("Employee not found");

  const checkrole = await RoleModel.findByPk(employee.role);
  if (checkrole?.name !== "cashier")
    throw BadRequest("Employee is not a cashier");

  const findCashboxOperator = await CashboxOperatorModel.findOne({
    where: {
      cashbox: params.cashboxID,
      operator: body.operator,
      status: CashboxOperatorStatusTypes.ACTIVE,
    },
  });

  if (findCashboxOperator !== null)
    throw Conflict("Operator is already actived at this cashbox");

  const cashboxOperator = await CashboxOperatorModel.create({
    cashbox: params.cashboxID,
    operator: body.operator,
    status: CashboxOperatorStatusTypes.ACTIVE,
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

  const cashboxOperators = await CashboxOperatorModel.findByPk(
    cashboxOperator.id,
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

  if (!cashboxOperators) {
    throw NotFound("Attraction operator not found");
  }

  return CashboxOperatorDTO(cashboxOperators.get({ plain: true }));
};

export const DeleteCashboxOperatorsService = async (
  params: CashboxOperatorParams,
) => {
  const cashbox = await CashboxModel.findByPk(params.cashboxID);

  if (!cashbox) {
    throw NotFound("Cashbox not found");
  }

  await CashboxOperatorModel.update(
    {
      status: CashboxOperatorStatusTypes.INACTIVE,
    },
    {
      where: {
        cashbox: params.cashboxID,
        operator: params.operatorID,
      },
    },
  );

  const operators = await CashboxOperatorModel.findAll({
    where: {
      cashbox: params.cashboxID,
      status: CashboxStatusTypes.ACTIVE,
    },
  });

  if (operators.length === 0) {
    await cashbox.update({
      status: CashboxStatusTypes.INACTIVE,
    });
  }

  return true;
};
