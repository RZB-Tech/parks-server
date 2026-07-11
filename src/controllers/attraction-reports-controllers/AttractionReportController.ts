import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithParamsAndHeaders,
  RouteWithQuery,
} from "../../types/routes";
import {
  ConfirmAttractionZReportsService,
  GetAccountingAttractionReportsService,
  GetAttractionZReportsService,
  GetNotConfirmedAttractionZReportDatesService,
  GetTodayAttractionReportsService,
  OpenAttractionReportService,
  UpdateAttractionReportStatusService,
} from "../../services/attraction-reports-services/AttractionReportsServices";

export const AttractionReportOpenController = makeReplyingController(
  "attraction-report",
  async (request: FastifyRequest<RouteWithParamsAndHeaders<AttractionReportParams, AttractionReportHeaders>>) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const deviceID = request.headers["device-id"]

    return OpenAttractionReportService(Number(operatorID), Number(deviceID), params);
  },
);

export const CloseAttractionReportController = makeReplyingController(
  "attraction-report",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<
        AttractionReportParams,
        ReqData<UpdateAttractionReportStatusData>
      >
    >,
  ) => {
    const operatorID = request.employee?.id;
    const params = request.params;
    const body = request.body.data;

    return UpdateAttractionReportStatusService(
      Number(operatorID),
      params,
      body,
    );
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

export const ConfirmAttractionZReportsController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<
      RouteWithData<ReqData<ConfirmAttractionZReportsData>>
    >,
  ) => {
    const operatorID = request.employee?.id;
    const body = request.body.data;

    return ConfirmAttractionZReportsService(Number(operatorID), body);
  },
);

export const GetAccountingAttractionReportsController = makeReplyingController(
  "attraction-reports",
  async (
    request: FastifyRequest<
      RouteWithQuery<GetAccountingAttractionReportsQuery>
    >,
  ) => {
    const params = request.params;

    return GetAccountingAttractionReportsService(request.query);
  },
);

export const GetNotConfirmedAttractionZReportDatesController =
  makeReplyingController(["dates"], async () => {
    const dates = await GetNotConfirmedAttractionZReportDatesService();

    return [dates];
  });