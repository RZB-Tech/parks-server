
export const FilesDTO = (file: FileModelI): FilesResponseDTO => ({
  id: Number(file.id),
  name: file.name,
  size: Number(file.size),
  type: file.type,
  // url: `api/v1/files/${file.id}/view`,
});

export const FileViewDTO = (file: FileViewDTO): FileViewDTO => ({
  body: file.body,
  name: file.name,
  type: file.type,
});

export const UploadFilesDTO = (
  data: UploadFilesResponseDTO,
): UploadFilesResponseDTO => ({
  dashboard_file: data.dashboard_file,
  main_file: data.main_file,
  files: data.files,
});