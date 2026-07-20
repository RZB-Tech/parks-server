export const ClientNewsDTO = (data: NewsModelI): ClientNewsResponseDTO => {
  return {
    id: Number(data.id),
    title: data.title,
    description: data.description,
    file: Number(data.file),
    publish_at: data.publish_at,
    expired_at: data.expired_at,
  };
};
