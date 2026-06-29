import { FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const BadRequest = (message = "Bad request") =>
  new AppError(400, message);

export const Unauthorized = (message = "Unauthorized") =>
  new AppError(401, message);

export const Forbidden = (message = "Access is denied") =>
  new AppError(403, message);

export const NotFound = (message = "Not found") => new AppError(404, message);

export const Conflict = (message = "Already exists") =>
  new AppError(409, message);

export const InternalServerError = (
  message = "Some technical problems on our side. Sorry",
) => new AppError(500, message);

export const ExceptionsHandler = (
  error: Error,
  req: FastifyRequest,
  rep: FastifyReply,
) => {
  if (error instanceof AppError) {
    req.log.warn(
      {
        statusCode: error.statusCode,
      },
      error.message,
    );

    return rep.code(error.statusCode).send({
      statusCode: error.statusCode,
      message: error.message,
    });
  }

  req.log.error(error);

  return rep.code(500).send({
    statusCode: 500,
    message: "Some technical problems on our side. Sorry",
  });
};
