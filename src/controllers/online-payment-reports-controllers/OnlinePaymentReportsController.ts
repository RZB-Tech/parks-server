import { FastifyReply, FastifyRequest } from "fastify";
import { withErrorHandler } from "../../utils/controllerHelpers";
import { GetOnlinePaymentDailyReportService } from "../../services/payment-services/OnlinePaymentReportServices";
import { GetOnlinePaymentDailyReportQuery } from "./types";

export const GetOnlinePaymentDailyReportController = withErrorHandler(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as GetOnlinePaymentDailyReportQuery;

    const report = await GetOnlinePaymentDailyReportService(query);

    return reply.status(200).send({
      statusCode: 200,
      data: report,
    });
  },
);
