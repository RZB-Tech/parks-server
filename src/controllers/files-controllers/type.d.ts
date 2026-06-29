declare interface UploadFileData {
  buffer: Buffer;
  filename: string;
  type: string;
  size: number;
  fieldname: "dashboard_file" | "main_file" | "files";
}

declare interface DeleteFilesData {
  files: number[];
}

declare interface FileParams {
  fileID: number;
  type: "view" | "download";
}
