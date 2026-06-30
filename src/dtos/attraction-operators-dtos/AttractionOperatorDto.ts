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

export const OperatorMeDTO = (data: OperatorMeDTOType): OperatorMeDTOType => {
  return {
    id: Number(data.id),
    firstname: data.firstname,
    lastname: data.lastname,
    phone_number: data.phone_number,
    file:
      data.file !== null && data.file !== undefined ? Number(data.file) : null,
    role: Number(data.role),
    status: data.status,
  };
};

export const OperatorAttractionsDTO = (
  data: OperatorAttractionWithAttractionData,
): AttractionDTO => {
  const attraction = data.attractions;

  return {
    id: Number(attraction.id),
    name: attraction.name,
    status: attraction.status,
    main_file:
      attraction.main_file !== null ? Number(attraction.main_file) : null,
    dashboard_file:
      attraction.dashboard_file !== null
        ? Number(attraction.dashboard_file)
        : null,
    price: Number(attraction.price),
    age_limit: Number(attraction.age_limit),
    min_height: Number(attraction.min_height),
    max_weight: Number(attraction.max_weight),
    duration: Number(attraction.duration),
    seats: Number(attraction.seats),
  };
};

export const OperatorAttractionMeDTO = (
  data: OperatorAttractionWithOperatorData,
): OperatorAttractionResponseDTO => {
  return {
    operator: OperatorMeDTO(data.operators),
    attraction: OperatorAttractionsDTO(data),
  };
};