export enum PaymeTransactionStateTypes {
  CREATED = 1,
  PERFORMED = 2,
  CANCELLED_BEFORE_PERFORM = -1,
  CANCELLED_AFTER_PERFORM = -2,
}
