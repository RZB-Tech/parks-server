import { randomUUID } from "crypto";
import { extname } from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { FileModel } from "../../models/postgresql/file-model/FileModel";
import { s3Client } from "../../configs/s3";
import {
  FilesDTO,
  FileViewDTO,
  UploadFilesDTO,
} from "../../dtos/files-dtos/FileDto";
import { sequelize } from "../../plugins/db/postgresql/db";
import { Op } from "sequelize";

export const UploadFileService = async (data: UploadFileData[]) => {
  const bucket = process.env.S3_BUCKET!;

  let dashboardFileId: number | null = null;
  let mainFileId: number | null = null;
  const galleryFileIds: number[] = [];
  const subAttarctionFileIds: number[] = [];

  for (const fileData of data) {
    const ext = extname(fileData.filename);
    const date = new Date().toISOString().split("T")[0];
    const key = `${date}/${randomUUID()}${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileData.buffer,
        ContentType: fileData.type,
        ACL: "public-read",
      }),
    );

    const file = await FileModel.create({
      name: fileData.filename,
      size: fileData.size,
      type: fileData.type,
      bucket,
      key,
    });

    if (fileData.fieldname === "dashboard_file") {
      dashboardFileId = Number(file.id);
    }

    if (fileData.fieldname === "main_file") {
      mainFileId = Number(file.id);
    }

    if (fileData.fieldname === "files") {
      galleryFileIds.push(Number(file.id));
    }

    if (fileData.fieldname === "sub_attraction_files") {
      subAttarctionFileIds.push(Number(file.id));
    }
  }

  return UploadFilesDTO({
    dashboard_file: dashboardFileId!,
    main_file: mainFileId!,
    files: galleryFileIds,
    sub_attraction_files: subAttarctionFileIds,
  });
};

export const GetFileService = async (data: FileParams) => {
  const file = await FileModel.findByPk(data.fileID);

  if (!file) throw new Error("404");

  const s3File = await s3Client.send(
    new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }),
  );

  if (!s3File.Body) throw new Error("404");

  return FileViewDTO({
    body: s3File.Body,
    type: file.type,
    name: file.name,
  });
};

export const DeleteFilesService = async (body: DeleteFilesData) => {
  const transaction = await sequelize.transaction();

  try {
    if (!body.files) throw new Error("400");

    const files = await FileModel.findAll({
      where: {
        id: { [Op.in]: body.files },
      },
      transaction,
    });

    for (const file of files) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: file.bucket,
          Key: file.key,
        }),
      );

      await file.destroy({ force: true, transaction });
    }
    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
