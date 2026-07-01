import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithParams, RouteWithParamsAndData, RouteWithQuery } from "../../types/routes";
import { GetAttractionZReportsService, GetTodayAttractionReportsService, OpenAttractionReportService, UpdateAttractionReportStatusService } from "../../services/attraction-reports-services/AttractionReportsServices";

export const AttractionReportOpenController = makeReplyingController(
  "attraction-report",
  async (request: FastifyRequest<RouteWithParams<AttractionReportParams>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;

    return OpenAttractionReportService(Number(operatorID), params);
  },
);

export const CloseAttractionReportController = makeReplyingController(
  "attraction-report",
  async (
    request: FastifyRequest<RouteWithParamsAndData<AttractionReportParams,ReqData<UpdateAttractionReportStatusData>>>,
  ) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const body = request.body.data;

    return UpdateAttractionReportStatusService(Number(operatorID), params, body);
  },
);

export const GetTodayAttractionReportsController = makeReplyingController(
  "attraction-reports",
  async (request: FastifyRequest<RouteWithParams<AttractionReportParams>>) => {
    const employeeID = request.employee?.id;
    const params = request.params;

    return GetTodayAttractionReportsService(Number(employeeID), params);
  },
);

// export const CloseCashboxReportController = makeReplyingController(
//   "success",
//   async (
//     request: FastifyRequest<
//       RouteWithParamsAndData<
//         CashboxReportsParams,
//         ReqData<CloseCashboxReportData>
//       >
//     >,
//   ) => {
//     const operatorID = request.employee?.id;
//     const params = request.params;
//     const body = request.body.data;

//     return CloseCashboxReportService(Number(operatorID), params, body);
//   },
// );

export const GetAttractionZReportsController = makeReplyingController(
  ["stats", "totals", "attractions"],
  async (
    request: FastifyRequest<RouteWithQuery<GetAttractionZReportsQuery>>,
  ) => {
    const query = request.query;
    const result = await GetAttractionZReportsService(query);

    return [result.stats, result.totals, result.attractions];
  },
);

// export const ConfirmZReportsController = makeReplyingController(
//   "success",
//   async (
//     request: FastifyRequest<RouteWithData<ReqData<ConfirmZReportsData>>>,
//   ) => {
//     const operatorID = request.employee?.id;
//     const body = request.body.data;

//     return ConfirmZReportsService(Number(operatorID), body);
//   },
// );

// export const GetAccountingCashboxReportsController = makeReplyingController(
//   "cashbox-reports",
//   async (
//     request: FastifyRequest<RouteWithQuery<GetAccountingCashboxReportsQuery>>,
//   ) => {
//     const params = request.params;

//     return GetAccountingCashboxReportsService(request.query);
//   },
// );
