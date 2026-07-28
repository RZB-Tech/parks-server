declare interface PaymentOperatorAttractionData
  extends AttractionOperatorModelI {
  attractions: {
    id: number;
    name: string;
    price: number;
    seats: number;
  };
}
