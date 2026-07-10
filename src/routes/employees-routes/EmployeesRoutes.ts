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
  fastify.get(
    "/employee/:employeeID",
    { schema: getEmployeeSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing"])] },
    GetEmployeeController,
  );

  fastify.get(
    "/employee/stats",
    { schema: getEmployeeStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing"])] },
    GetEmployeeStatsController,
  );

  fastify.get(
    "/employees",
    { schema: getEmployeesSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing"])] },
    GetEmployeesController,
  );

  fastify.post(
    "/employees",
    { schema: createEmployeesSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin"])] },
    CreateEmployeesController,
  );

  fastify.put(
    "/employee/:employeeID",
    { schema: updateEmployeesSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin"])] },
    UpdateEmployeesController,
  );

  fastify.delete(
    "/employees",
    { schema: deleteEmployeesSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin"])] },
    DeleteEmployeesController,
  );
};

export default EmployeesRouter;
