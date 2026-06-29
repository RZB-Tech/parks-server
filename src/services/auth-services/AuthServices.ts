import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Unauthorized } from "../../exceptions";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";

export const LoginService = async (body: LoginData) => {
  const employee = await EmployeeModel.findOne({
    where: {
      phone_number: body.phone_number,
    },
  });

  if (!employee) {
    throw Unauthorized("Invalid phone number or password");
  }

  const isPasswordValid = await bcrypt.compare(
    body.password,
    employee.password,
  );

  if (!isPasswordValid) {
    throw Unauthorized("Invalid phone number or password");
  }

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
