import "@fastify/multipart";
import { FastifyReply, FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  DeleteFilesService,
  GetFileService,
  UploadFileService,
} from "../../services/files-services/FilesServices";
import { ReqData, RouteWithData, RouteWithParams } from "../../types/routes";

export const UploadFilesController = makeReplyingController(
  "files",
  async (request: FastifyRequest) => {
    const filesData: (UploadFileData & { fieldname: string })[] = [];

    for await (const file of request.files()) {
      const buffer = await file.toBuffer();

      filesData.push({
        buffer,
        filename: file.filename,
        size: buffer.length,
        type: file.mimetype,
        fieldname: file.fieldname as UploadFileData["fieldname"],
      });
    }

    return await UploadFileService(filesData);
  },
);

export const GetFilesController = async (
  request: FastifyRequest<RouteWithParams<FileParams>>,
  reply: FastifyReply,
) => {
  const params = request.params;

  const result = await GetFileService(params);

  reply.header("Content-Type", result.type);

  if (params.type === "download") {
    reply.header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.name)}"`,
    );
  } else if (params.type === "view") {
    reply.header(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(result.name)}"`,
    );
  } else throw new Error("400");

  return reply.send(result.body);
};

export const DeleteFilesController = makeReplyingController(
  "success",
  async (request: FastifyRequest<RouteWithData<ReqData<DeleteFilesData>>>) => {
    const body = request.body.data;
    return await DeleteFilesService(body);
  },
);
