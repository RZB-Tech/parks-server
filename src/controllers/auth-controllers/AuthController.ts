import { FastifyReply, FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData } from "../../types/routes";
import {
  GetMeService,
  LoginService,
} from "../../services/auth-services/AuthServices";
import "@fastify/cookie";
import { AppError } from "../../exceptions";
import {
  AssertEmployeeLoginAllowed,
  ClearEmployeeLoginFailures,
  RegisterEmployeeLoginFailure,
} from "../../utils/employeeLoginRateLimit";

export const LoginController = makeReplyingController(
  "auth",
  async (
    request: FastifyRequest<RouteWithData<ReqData<LoginData>>>,
    reply: FastifyReply,
  ) => {
    const body = request.body.data;
    const rateLimitKey = request.ip;

    AssertEmployeeLoginAllowed(rateLimitKey);

    let result: Awaited<ReturnType<typeof LoginService>>;

    try {
      result = await LoginService(body);
      ClearEmployeeLoginFailures(rateLimitKey);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        RegisterEmployeeLoginFailure(rateLimitKey);
      }

      throw error;
    }

    reply.setCookie("fingerprint", result.fingerprint, {
      httpOnly: true,
      secure: false, // local http uchun false, production https uchun true
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });

    return {
      accessToken: result.jwtToken,
    };
  },
);

export const GetMeController = makeReplyingController(
  "employee",
  async (request: FastifyRequest, reply: FastifyReply) => {
    const employeeID = request.employee?.id;

    return await GetMeService(Number(employeeID));
  },
);
