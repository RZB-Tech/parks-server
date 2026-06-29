import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { GetRolesService } from "../../services/roles-services/RolesServices";

export const GetRolesController = makeReplyingController(
  "roles",
  async (request: FastifyRequest) => {
    return GetRolesService();
  },
);
