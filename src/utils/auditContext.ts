import { AsyncLocalStorage } from "node:async_hooks";
import { FastifyRequest } from "fastify";

type AuditRequestContext = {
  request: FastifyRequest;
};

const auditRequestStorage = new AsyncLocalStorage<AuditRequestContext>();

export const RunWithAuditRequest = (
  request: FastifyRequest,
  callback: () => void,
) => auditRequestStorage.run({ request }, callback);

export const GetAuditRequest = () => auditRequestStorage.getStore()?.request;
