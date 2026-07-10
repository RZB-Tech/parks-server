declare type AttractionRoundOperatorPlain = {
  id: number;
  firstname: string;
  lastname: string;
  phone_number: string;
  telegram_username: string;
  role: number;
  status: string;
  file: number | null;
};

declare type AttractionRoundAttractionPlain = {
  id: number;
  name: string;
  manufacturer: string;
  status: string;
  dashboard_file: number | null;
  main_file: number | null;
  files: number[];
  price: number;
  duration: number;
  seats: number;
  age_limit: number | null;
  min_height: number | null;
  max_weight: number;
  description: string;
};

declare type AttractionRoundWithRelationsPlain = AttractionRoundModelI & {
  operators?: AttractionRoundOperatorPlain | null;
  attractions?: AttractionRoundAttractionPlain | null;
};
