import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithParams, RouteWithParamsAndData } from "../../types/routes";
import { OpenAttractionReportService, UpdateAttractionReportStatusService } from "../../services/attraction-reports-services/AttractionReportsServices";

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

// export const CashboxReportsTodayController = makeReplyingController(
//   "cashbox-reports",
//   async (request: FastifyRequest<RouteWithParams<CashboxReportsParams>>) => {
//     const employeeID = request.employee?.id;
//     const params = request.params;

//     return GetTodayCashboxReportsService(Number(employeeID), params);
//   },
// );

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

// export const GetZReportsController = makeReplyingController(
//   ["stats", "cashbox-zreports", "pagination"],
//   async (request: FastifyRequest<RouteWithQuery<GetZReportsQuery>>) => {
//     const query = request.query;

//     const result = await GetZReportsService(query);

//     return [result.stats, result.cashboxes, result.pagination];
//   },
// );

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
