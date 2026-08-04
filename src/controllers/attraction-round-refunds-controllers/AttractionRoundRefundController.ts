import { FastifyRequest } from "fastify";
import { ReqData } from "../../types/routes";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  GetAttractionRoundRefundsService,
  RefundFinishedAttractionRoundService,
} from "../../services/attraction-round-refunds-services/AttractionRoundRefundServices";

export const GetAttractionRoundRefundsController = makeReplyingController(
  ["attraction-round-refunds", "pagination"],
  async (request: FastifyRequest) => {
    const operatorID = request.employee?.id;
    const query = request.query as GetAttractionRoundRefundsQuery;
    const result = await GetAttractionRoundRefundsService(
      Number(operatorID),
      query,
    );

    return [
      result.refunds,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

export const RefundFinishedAttractionRoundController = makeReplyingController(
  "attraction-round-refund",
  async (request: FastifyRequest) => {
    const operatorID = request.employee?.id;
    const params = request.params as AttractionRoundRefundParams;
    const body = request.body as ReqData<RefundAttractionRoundData>;

    return RefundFinishedAttractionRoundService(
      Number(operatorID),
      params,
      body.data,
    );
  },
);
