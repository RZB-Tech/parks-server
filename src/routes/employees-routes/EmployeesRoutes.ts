import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { CreateEmployeesController, DeleteEmployeesController, GetEmployeeController, GetEmployeesController, GetEmployeeStatsController, UpdateEmployeesController } from "../../controllers/employee-controllers/EmployeeController";
import { createEmployeesSchema, deleteEmployeesSchema, getEmployeeSchema, getEmployeesSchema, getEmployeeStatsSchema, updateEmployeesSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const EmployeesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  // (AuthMiddleware, RoleMiddleware(["superadmin"]));
  fastify.get(
    "/employee/:employeeID",
    { schema: getEmployeeSchema, preHandler: [] },
    GetEmployeeController,
  );

  fastify.get(
    "/employee/stats",
    { schema: getEmployeeStatsSchema, preHandler: [] },
    GetEmployeeStatsController,
  );

  fastify.get(
    "/employees",
    { schema: getEmployeesSchema, preHandler: [] },
    GetEmployeesController,
  );

  fastify.post(
    "/employees",
    { schema: createEmployeesSchema, preHandler: [] },
    CreateEmployeesController,
  );

  fastify.put(
    "/employee/:employeeID",
    { schema: updateEmployeesSchema, preHandler: [] },
    UpdateEmployeesController,
  );

  fastify.delete(
    "/employees",
    { schema: deleteEmployeesSchema, preHandler: [] },
    DeleteEmployeesController,
  );
};

export default EmployeesRouter;
