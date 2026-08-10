import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  AttractionReportOpenController,
  CloseAttractionReportController,
  ConfirmAttractionZReportsController,
  GetAccountingAttractionReportsController,
  GetAttractionZReportsController,
  GetNotConfirmedAttractionZReportDatesController,
  GetTodayAttractionReportsController,
} from "../../controllers/attraction-reports-controllers/AttractionReportController";
import {
  confirmAttractionZReportsSchema,
  getAccountingAttractionReportsSchema,
  getAttractionZReportsSchema,
  getNotConfirmedAttractionZReportDatesSchema,
  getTodayAttractionReportsSchema,
  openAttractionReportSchema,
  updateAttractionReportStatusSchema,
} from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AttractionReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/attractions/:attractionID/reports/open",
    { schema: openAttractionReportSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'head_operator', 'operator', 'head_cashier'])] },
    AttractionReportOpenController,
  );

  fastify.put(
    "/attractions/:attractionID/reports/:reportID/status",
    {
      schema: updateAttractionReportStatusSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'head_operator', 'operator', 'head_cashier'])],
    },
    CloseAttractionReportController,
  );

  fastify.get(
    "/attractions/:attractionID/reports",
    { schema: getTodayAttractionReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])] },
    GetTodayAttractionReportsController,
  );

  fastify.get(
    "/attraction/zreports",
    { schema: getAttractionZReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])] },
    GetAttractionZReportsController,
  );

  fastify.post(
    "/attractions/zreports/confirmation",
    { schema: confirmAttractionZReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'head_accountant', 'head_marketing', 'head_operator', 'head_cashier'])] },
    ConfirmAttractionZReportsController,
  );

  fastify.get(
    "/attractions/reports/accounting",
    { schema: getAccountingAttractionReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'head_cashier'])] },
    GetAccountingAttractionReportsController,
  );

  fastify.get(
    "/attraction/notconfirmed/zreports/dates",
    {
      schema: getNotConfirmedAttractionZReportDatesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'head_cashier'])],
    },
    GetNotConfirmedAttractionZReportDatesController,
  );
};

export default AttractionReportsRouter;
