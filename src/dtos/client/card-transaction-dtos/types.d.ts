declare interface ClientAttractionPaymentData {
  totalAmount: number;
  membersCount: number;
  card: number;
}

declare interface ClientAttractionPaymentTransactionDTO {
  id: number;
  card: number;
  attraction: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_type: string;
  status: string;
}

declare interface ClientAttractionPaymentResponseDTO {
  paid: boolean;
  message: string;
  transaction: ClientAttractionPaymentTransactionDTO;
}

declare interface ClientTransactionCardDTO {
  id: number;
  card: string;
  type: string;
}

declare interface ClientTransactionAttractionDTO {
  id: number;
  name: string;
  main_file: number | null;
}

declare interface ClientTransactionResponseDTO {
  id: number;

  type: string;
  direction: "income" | "expense";

  amount: number;
  signed_amount: number;

  balance_before: number;
  balance_after: number;

  payment_type: string | null;
  status: string;

  card: ClientTransactionCardDTO;
  attraction: ClientTransactionAttractionDTO | null;

  created_at: Date;
}

declare interface ClientTransactionFilterCardDTO {
  id: number;
  card: string;
  type: string;
  status: string;
  balance: number;
}

declare interface ClientTransactionsResponseDTO {
  cards: ClientTransactionFilterCardDTO[];

  period: {
    month: string;
  };

  summary: {
    income: number;
    expense: number;
  };

  transactions: ClientTransactionResponseDTO[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
