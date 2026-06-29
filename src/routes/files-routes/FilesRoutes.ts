import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { deleteFilesSchema, getFileSchema, uploadFilesSchema } from "./schema";
import {
  DeleteFilesController,
  GetFilesController,
  UploadFilesController,
} from "../../controllers/files-controllers/FilesController";

const FilesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/files",
    { schema: uploadFilesSchema, preHandler: [] },
    UploadFilesController,
  );

  fastify.get(
    "/files/:fileID/:type",
    { schema: getFileSchema, preHandler: [] },
    GetFilesController,
  );

  fastify.delete(
    "/files",
    { schema: deleteFilesSchema, preHandler: [] },
    DeleteFilesController,
  );
};

export default FilesRouter;
