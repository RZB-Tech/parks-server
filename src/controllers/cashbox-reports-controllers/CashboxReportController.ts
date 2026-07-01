import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";
import {
  ConfirmZReportsService,
  GetAccountingCashboxReportsService,
  GetTodayCashboxReportsService,
  GetZReportsService,
  OpenCashboxReportService,
  StatusCashboxReportService,
} from "../../services/cashbox-reports-services/CashboxReportsServices";

export const CashboxReportOpenController = makeReplyingController(
  "cashbox-report",
  async (request: FastifyRequest<RouteWithParams<CashboxReportsParams>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;

    return OpenCashboxReportService(Number(operatorID), params);
  },
);

export const CashboxReportsTodayController = makeReplyingController(
  "cashbox-reports",
  async (request: FastifyRequest<RouteWithParams<CashboxReportsParams>>) => {
    const employeeID = request.employee?.id;
    const params = request.params;

    return GetTodayCashboxReportsService(Number(employeeID), params);
  },
);

export const StatusCashboxReportController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithParamsAndData<CashboxReportsParams,ReqData<CloseCashboxReportData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const body = request.body.data;

    return StatusCashboxReportService(Number(operatorID), params, body);
  },
);

export const GetZReportsController = makeReplyingController(
  ["stats", "totals", "cashboxes"],
  async (request: FastifyRequest<RouteWithQuery<GetZReportsQuery>>) => {
    const query = request.query;

    const result = await GetZReportsService(query);

    return [result.stats, result.totals, result.cashboxes];
  },
);

export const ConfirmZReportsController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithData<ReqData<ConfirmZReportsData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const body = request.body.data;

    return ConfirmZReportsService(Number(operatorID), body);
  },
);

export const GetAccountingCashboxReportsController = makeReplyingController(
  "cashbox-reports",
  async (
    request: FastifyRequest<RouteWithQuery<GetAccountingCashboxReportsQuery>>,
  ) => {
    const params = request.params;
    
    return GetAccountingCashboxReportsService(request.query);
  },
);
