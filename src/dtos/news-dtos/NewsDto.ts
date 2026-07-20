export const NewsDTO = (data: NewsModelI): NewsResponseDTO => {
  return {
    id: Number(data.id),

    title: data.title,
    description: data.description,

    file: Number(data.file),

    status: data.status,

    publish_at: data.publish_at,
    expired_at: data.expired_at,

    published_at: data.published_at,
    archived_at: data.archived_at,
  };
};
