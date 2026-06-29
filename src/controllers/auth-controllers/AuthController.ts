import { FastifyReply, FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData } from "../../types/routes";
import { LoginService } from "../../services/auth-services/AuthServices";
import "@fastify/cookie";


export const LoginController = makeReplyingController(
  "auth",
  async (
    request: FastifyRequest<RouteWithData<ReqData<LoginData>>>,
    reply: FastifyReply,
  ) => {
    const body = request.body.data;

    const result = await LoginService(body);

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