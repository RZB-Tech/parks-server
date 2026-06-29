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
  CreateEmployeeData,
  DeleteEmployeesData,
  EmployeeParams,
  GetEmployeesQuery,
} from "./types";
import {
  CreateEmployeesService,
  DeleteEmployeesService,
  GetEmployeeService,
  GetEmployeesService,
  GetEmployeeStatsService,
  UpdateEmployeesService,
} from "../../services/employee-services/EmployeesServices";

export const GetEmployeeController = makeReplyingController(
  "employee",
  async (request: FastifyRequest<RouteWithParams<EmployeeParams>>) => {
    const params = request.params;

    return GetEmployeeService(params);
  },
);

export const GetEmployeeStatsController = makeReplyingController(
  "employee_stats",
  async (request: FastifyRequest) => {
    return GetEmployeeStatsService();
  },
);

export const GetEmployeesController = makeReplyingController(
  ["employees", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetEmployeesQuery>>) => {
    const query = request.query;
    const result = await GetEmployeesService(query);

    return [
      result.employees,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

export const CreateEmployeesController = makeReplyingController(
  "employee",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateEmployeeData>>>,
  ) => {
    const body = request.body.data;

    return CreateEmployeesService(body);
  },
);

export const UpdateEmployeesController = makeReplyingController(
  "employee",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<EmployeeParams, ReqData<CreateEmployeeData>>
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return UpdateEmployeesService(params, body);
  },
);

export const DeleteEmployeesController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithData<ReqData<DeleteEmployeesData>>>,
  ) => {
    const body = request.body.data;

    return DeleteEmployeesService(body);
  },
);
