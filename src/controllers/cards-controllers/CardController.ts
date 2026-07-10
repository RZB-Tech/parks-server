import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  CreateCardsService,
  DeleteCardsService,
  GetCardsService,
  GetCardStatsService,
  UpdateCardsService,
} from "../../services/card-services/CardsServices";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";
import { BadRequest } from "../../exceptions";
import { CardType } from "../../models/postgresql/cards-model/enums";

export const GetCardStatsController = makeReplyingController(
  "card_stats",
  async (request: FastifyRequest<RouteWithQuery<GetCardsQuery>>) => {
    const query = request.query;
    return GetCardStatsService(query);
  },
);

export const GetCardsController = makeReplyingController(
  ["cards", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetCardsQuery>>) => {
    const query = request.query;
    const result = await GetCardsService(query);

    return [
      result.cards,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

export const CreateCardsController = makeReplyingController(
  "cards",
  async (request: FastifyRequest) => {
    const employeeID = request.employee?.id;
    let fileBuffer: Buffer | null = null;
    let batchName: string | null = null;
    let type: string | null = null;
    let balance: number | null = null;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (part.fieldname === "file") {
          fileBuffer = await part.toBuffer();
        } else {
          await part.toBuffer();
        }
      }

      if (part.type === "field") {
        if (part.fieldname === "batch_name") {
          batchName = String(part.value);
        }

        if (part.fieldname === "type") {
          type = String(part.value);
        }

        if (part.fieldname === "balance") {
          const parsedBalance = Number(part.value);

          if (Number.isNaN(parsedBalance)) {
            throw BadRequest("Balance is invalid.");
          }

          balance = parsedBalance;
        }
      }
    }

    if (!fileBuffer) {
      throw BadRequest("Excel file is required.");
    }

    if (!batchName || !batchName.trim()) {
      throw BadRequest("Batch name is required.");
    }

    if (!type || !type.trim()) {
      throw BadRequest("Card type is required.");
    }

    return CreateCardsService(Number(employeeID), {
      file: fileBuffer,
      batch_name: batchName.trim(),
      type: type.trim() as CardType,
      balance: balance ?? null,
    });
  },
);

export const UpdateCardsController = makeReplyingController(
  "card",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<CardsParams, ReqData<UpdateCardsData>>
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return UpdateCardsService(params, body);
  },
);

export const DeleteCardsController = makeReplyingController(
  "success",
  async (request: FastifyRequest<RouteWithData<ReqData<DeleteCardsData>>>) => {
    const body = request.body.data;

    return DeleteCardsService(body);
  },
);
