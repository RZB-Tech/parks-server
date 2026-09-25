declare interface AttractionRuleTranslations {
  uz: string;
  ru: string;
  en: string;
}

declare interface AttractionRules {
  parent_accompaniment: AttractionRuleTranslations;
  strict_rules: AttractionRuleTranslations;
  exceptions: AttractionRuleTranslations;
}

declare type AttractionRulesInput = Partial<{
  parent_accompaniment: Partial<AttractionRuleTranslations>;
  strict_rules: Partial<AttractionRuleTranslations>;
  exceptions: Partial<AttractionRuleTranslations>;
}>;

declare interface AttractionModelI {
  id: number;
  device: number | null;
  name: string;
  manufacturer: string;
  status: import("./enums").AttractionStatusTypes;
  dashboard_file: number;
  main_file: number;
  files: Array<number>;
  sub_attraction_files: Array<number>;
  size: number;
  latitude: string | null;
  longitude: string | null;
  price: number | null;
  duration: string;
  rules: AttractionRules;
  seats: number;
  age_limit: number;
  min_height: number;
  max_weight: number;
  description: string;

  attraction_operator?: Array<
    AttractionOperatorModelI & {
      operators?: EmployeeModelI;
    }
  >;
  tariffs?: AttractionTariffModelI[];
}
