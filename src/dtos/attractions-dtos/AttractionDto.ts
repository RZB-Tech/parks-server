export const AttractionWithOperatorsDTO = (data: any) => {
  return {
    id: Number(data.id),
    name: data.name,
    manufacturer: data.manufacturer,
    category: data.category,
    status: data.status,

    dashboard_file: Number(data.dashboard_file) ?? null,
    main_file: Number(data.main_file) ?? null,
    files: data.files ?? [],

    price: data.price,
    duration: data.duration,
    seats: data.seats,
    age_limit: data.age_limit,
    min_height: data.min_height,
    max_weight: data.max_weight,
    description: data.description,

    operators: data.attraction_operator
      ? data.attraction_operator.map((item: any) => {
          return {
            id: Number(item.operators?.id),
            firstname: item.operators?.firstname ?? "",
            lastname: item.operators?.lastname ?? "",
            file: Number(item.operators?.file) ?? null,
            type: item.type,
          };
        })
      : [],
  };
};

export const AttractionDTO = (data: AttractionModelI) => {
  return {
    id: Number(data.id),
    name: data.name,
    manufacturer: data.manufacturer,
    category: data.category,
    status: data.status,

    dashboard_file: data.dashboard_file ?? null,
    main_file: data.main_file ?? null,
    files: data.files ?? [],

    price: data.price,
    duration: data.duration,
    seats: data.seats,
    age_limit: data.age_limit,
    min_height: data.min_height,
    max_weight: data.max_weight,
    description: data.description,
  };
};
