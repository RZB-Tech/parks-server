import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { AppError, Forbidden, NotFound } from "../../exceptions";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";

export const ROUND_EVENTS_ROLES = [
  "superadmin", "admin", "owner", "director", "head_accountant", "head_marketing",
  "head_operator", "operator", "head_cashier",
];

export const AssertAttractionRoundEventsAccess = async (operatorID: number, attractionID: number) => {
  if (!await AttractionModel.findByPk(attractionID, { attributes: ["id"] })) {
    throw NotFound("ATTRACTION_NOT_FOUND");
  }
  // X-report owners can work without a legacy attraction_operator assignment.
  // Historical ownership also permits refreshes of today's closed/refunded rounds.
  const report = await AttractionReportModel.findOne({
    where: { attraction: attractionID, operator: operatorID, report_type: AttractionReportTypes.XREPORT },
    attributes: ["id"],
  });
  if (report) return;
  const assignment = await AttractionOperatorModel.findOne({
    where: { attraction: attractionID, operator: operatorID, status: AttractionOperatorStatusTypes.ACTIVE },
    attributes: ["id"],
  });
  if (!assignment) throw Forbidden("ATTRACTION_ROUND_EVENTS_ACCESS_DENIED");
};

export const AttractionRoundEventsController = async (
  request: FastifyRequest<{ Params: { attractionID: number } }>,
  reply: FastifyReply,
) => {
  const attractionID = Number(request.params.attractionID);
  const operatorID = Number(request.employee!.id);
  await AssertAttractionRoundEventsAccess(operatorID, attractionID);
  const broker = request.server.attractionRoundEvents;
  if (!broker?.available) {
    reply.header("Retry-After", "3");
    throw new AppError(503, "ATTRACTION_ROUND_EVENTS_UNAVAILABLE");
  }

  const token = request.headers.authorization!.split(" ")[1];
  // AuthMiddleware has already verified this token. Decode only to bound stream lifetime.
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const lifetime = Math.min(3_600_000, decoded.exp ? decoded.exp * 1000 - Date.now() : 3_600_000);
  if (lifetime <= 0) throw new AppError(401, "Token expired");

  const raw = reply.raw;
  let closed = false;
  let heartbeat: NodeJS.Timeout | undefined;
  let expiry: NodeJS.Timeout | undefined;
  let accessCheck: NodeJS.Timeout | undefined;
  let unsubscribe = () => {};
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearInterval(accessCheck);
    clearTimeout(expiry);
    unsubscribe();
    raw.end();
  };
  const write = (chunk: string) => {
    if (closed) return;
    if (raw.destroyed || raw.writableEnded) { close(); return; }
    // A slow browser must not accumulate an unbounded payment notification queue.
    if (!raw.write(chunk)) { close(); raw.destroy(); }
  };
  const event = (name: string, data: unknown) =>
    write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

  reply.hijack();
  for (const [name, value] of Object.entries({
    ...reply.getHeaders(), // Preserve CORS headers populated by Fastify hooks.
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, no-transform",
    "X-Accel-Buffering": "no",
  })) {
    if (value !== undefined) raw.setHeader(name, value);
  }
  raw.writeHead(200);
  raw.on("close", close);
  raw.on("error", close);
  unsubscribe = broker.subscribe({
    attractionID, operatorID,
    onChange: (change) => event("round.changed", change),
    onUnavailable: close,
  });
  // The browser must fetch current/today only after receiving this event, so
  // changes between subscription and the initial snapshot cannot be missed.
  write("retry: 3000\n\n");
  event("ready", { attraction_id: attractionID, operator_id: operatorID, resync: true });
  if (closed) return;
  heartbeat = setInterval(() => write(": heartbeat\n\n"), 15_000);
  heartbeat.unref();
  expiry = setTimeout(() => {
    event("auth.expired", { reconnect: true });
    close();
  }, lifetime);
  expiry.unref();

  let checking = false;
  accessCheck = setInterval(() => {
    if (checking || closed) return;
    checking = true;
    void (async () => {
      try {
        await AuthMiddleware.call(request.server, request, reply, () => {});
        await RoleMiddleware(ROUND_EVENTS_ROLES).call(request.server, request, reply, () => {});
        await AssertAttractionRoundEventsAccess(operatorID, attractionID);
      } catch {
        event("access.revoked", { reconnect: true });
        close();
      } finally {
        checking = false;
      }
    })();
  }, 60_000);
  accessCheck.unref();
};
