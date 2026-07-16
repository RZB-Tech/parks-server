export const AttractionWithOperatorsDTO = (data: any) => {
  return {
    id: Number(data.id),
    device: Number(data.device),
    name: data.name,
    manufacturer: data.manufacturer,
    status: data.status,

    dashboard_file: Number(data.dashboard_file) ?? null,
    main_file: Number(data.main_file) ?? null,
    files: data.files ?? [],
    sub_attraction_files: data.sub_attraction_files ?? [],

    price: data.price,
    duration: data.duration,
    seats: data.seats,
    age_limit: data.age_limit,
    min_height: data.min_height,
    max_weight: data.max_weight,
    description: data.description,

    latitude: data.latitude,
    longitude: data.longitude,

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
    status: data.status,

    dashboard_file: data.dashboard_file ?? null,
    main_file: data.main_file ?? null,
    files: data.files ?? [],
    sub_attraction_files: data.sub_attraction_files ?? [],

    price: data.price,
    duration: data.duration,
    seats: data.seats,
    age_limit: data.age_limit,
    min_height: data.min_height,
    max_weight: data.max_weight,
    description: data.description,

    latitude: data.latitude,
    longitude: data.longitude,
  };
};
