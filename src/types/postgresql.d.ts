declare interface TableOtherAttributes {
  id: bigint;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

type TableOptionalAttributes = Optional<
  TableOtherAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at"
>

interface ModelStatic {
  initialize?: (sequelize: Sequelize) => void;
  associate?: (models: ModelsType) => void;
}