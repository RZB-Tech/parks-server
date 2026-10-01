import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { NotFound, Unauthorized } from "../../exceptions";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { EmployeeDTO } from "../../dtos/employees-dtos/EmployeeDto";
import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";
import {
  HashEmployeeNfc,
  IsValidEmployeeNfc,
  NormalizeEmployeeNfc,
} from "../../utils/employeeNfc";

const INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

const CreateEmployeeAuth = (employee: EmployeeModel) => {
  const fingerprint = crypto.randomBytes(50).toString("hex");

  const fingerprintHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 0, 0);

  const jwtToken = jwt.sign(
    {
      employee_id: employee.id,
      role_id: employee.role,
      exp: Math.floor(expiresAt.getTime() / 1000),
      fingerprint: fingerprintHash,
    },
    process.env.JWT_SECRET as string,
  );

  return {
    jwtToken,
    fingerprint,
  };
};

export const LoginService = async (body: LoginData) => {
  const hasNfc = body.nfc !== undefined;
  const hasPhoneNumber = body.phone_number !== undefined;
  const hasPassword = body.password !== undefined;
  const isNfcLogin = hasNfc && !hasPhoneNumber && !hasPassword;
  const isPasswordLogin = !hasNfc && hasPhoneNumber && hasPassword;

  if (!isNfcLogin && !isPasswordLogin) {
    throw Unauthorized(INVALID_CREDENTIALS);
  }

  let employee: EmployeeModel | null = null;

  if (isNfcLogin) {
    const nfc = NormalizeEmployeeNfc(body.nfc);

    if (!IsValidEmployeeNfc(nfc)) {
      throw Unauthorized(INVALID_CREDENTIALS);
    }

    employee = await EmployeeModel.findOne({
      where: {
        nfc_hash: HashEmployeeNfc(nfc),
      },
    });
  } else {
    employee = await EmployeeModel.findOne({
      where: {
        phone_number: body.phone_number!,
      },
    });

    if (
      !employee ||
      !(await bcrypt.compare(body.password!, employee.password))
    ) {
      throw Unauthorized(INVALID_CREDENTIALS);
    }
  }

  if (!employee || employee.status !== EmployeeStatusTypes.ACTIVE) {
    throw Unauthorized(INVALID_CREDENTIALS);
  }

  return CreateEmployeeAuth(employee);
};


export const GetMeService = async (
  employeeID: number,
): Promise<EmployeeResponseDTO> => {
  const employee = await EmployeeModel.findByPk(employeeID);

  if (employee == null) throw NotFound("Employee not found");

  const employeeData = employee.get();
  return EmployeeDTO(employeeData);
};
