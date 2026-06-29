export const AttractionOperatorDTO = (
  data: AttractionOperatorWithEmployeeModelI,
): AttractionOperatorResponseDTO => {
  return {
    id: Number(data.id),
    attraction: Number(data.attraction),
    type: data.type,
    status: data.status,

    operator: data.operators
      ? {
          id: Number(data.operators.id),
          firstname: data.operators.firstname,
          lastname: data.operators.lastname,
          file:
            data.operators.file !== null ? Number(data.operators.file) : null,
        }
      : null,
  };
};
