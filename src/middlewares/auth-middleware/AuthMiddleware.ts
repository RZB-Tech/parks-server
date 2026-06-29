import "@fastify/cookie";
import crypto from "crypto";
import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import jwt from "jsonwebtoken";
import { Unauthorized } from "../../exceptions";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";


type JwtPayload = {
  employee_id: number;
  fingerprint: string;
  token_type: "access";
};

declare module "fastify" {
  interface FastifyRequest {
    employee?: {
      id: number;
      role_id: number;
      role_name?: string;
    };
  }
}

export const AuthMiddleware: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw Unauthorized("Authorization header is required");
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    throw Unauthorized("Invalid authorization format");
  }

  // const fingerprint = request.cookies.fingerprint;

  // if (!fingerprint) {
  //   throw Unauthorized("Fingerprint is required");
  // }

  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw Unauthorized("Token expired");
    }

    throw Unauthorized("Invalid token");
  }

  // const currentFingerprintHash = crypto
  //   .createHash("sha256")
  //   .update(fingerprint)
  //   .digest("hex");

  // if (decoded.fingerprint !== currentFingerprintHash) {
  //   throw Unauthorized("Invalid token fingerprint");
  // }

  const employee = await EmployeeModel.findOne({
    where: {
      id: decoded.employee_id,
    },
  });

  if (!employee) {
    throw Unauthorized("Employee not found");
  }

  // const role = await RoleModel.findOne({
  //   where: {
  //     id: employee.role,
  //   },
  // });

  // if (!role) {
  //   throw Unauthorized("Role not found");
  // }

  request.employee = {
    id: employee.id,
    role_id: employee.role,
    // role_name: role.name,
  };
};
