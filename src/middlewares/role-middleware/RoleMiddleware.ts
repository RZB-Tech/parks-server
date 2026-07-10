import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { Forbidden, Unauthorized } from "../../exceptions";

export const RoleMiddleware = (allowedRoles: string[]): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.employee) {
      throw Unauthorized("Unauthorized");
    }

    if (!allowedRoles.includes(request.employee.role_name!)) {
      throw Forbidden("You do not have access to this route");
    }
  };
};
