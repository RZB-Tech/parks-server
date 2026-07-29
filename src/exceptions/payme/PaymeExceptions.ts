const localizedMessage = (
  uz: string,
  ru: string,
  en: string,
): PaymeLocalizedMessage => ({
  uz,
  ru,
  en,
});

export const PaymeErrors = {
  invalidRequest: (): PaymeRpcError => ({
    code: -32600,
    message: localizedMessage(
      "JSON-RPC so'rovi noto'g'ri",
      "Некорректный JSON-RPC запрос",
      "Invalid JSON-RPC request",
    ),
  }),

  methodNotFound: (method?: string): PaymeRpcError => ({
    code: -32601,
    message: localizedMessage(
      "So'ralgan metod topilmadi",
      "Запрашиваемый метод не найден",
      "Requested method was not found",
    ),
    data: method ?? null,
  }),

  unauthorized: (): PaymeRpcError => ({
    code: -32504,
    message: localizedMessage(
      "Metodni bajarish uchun ruxsat yetarli emas",
      "Недостаточно привилегий для выполнения метода",
      "Insufficient privileges to perform the method",
    ),
  }),

  system: (): PaymeRpcError => ({
    code: -32400,
    message: localizedMessage(
      "Ichki tizim xatosi",
      "Внутренняя системная ошибка",
      "Internal system error",
    ),
  }),

  invalidAmount: (): PaymeRpcError => ({
    code: -31001,
    message: localizedMessage(
      "To'lov summasi noto'g'ri",
      "Неверная сумма платежа",
      "Invalid payment amount",
    ),
    data: "amount",
  }),

  orderNotFound: (): PaymeRpcError => ({
    code: -31050,
    message: localizedMessage(
      "To'lov buyurtmasi topilmadi",
      "Платежный заказ не найден",
      "Payment order was not found",
    ),
    data: "account.order_id",
  }),

  cannotPerform: (): PaymeRpcError => ({
    code: -31008,
    message: localizedMessage(
      "Bu buyurtma uchun to'lovni amalga oshirib bo'lmaydi",
      "Невозможно выполнить платеж для этого заказа",
      "Payment cannot be performed for this order",
    ),
    data: "account.order_id",
  }),

  transactionNotFound: (): PaymeRpcError => ({
    code: -31003,
    message: localizedMessage(
      "Tranzaksiya topilmadi",
      "Транзакция не найдена",
      "Transaction was not found",
    ),
    data: "id",
  }),

  cannotCancel: (): PaymeRpcError => ({
    code: -31007,
    message: localizedMessage(
      "Tranzaksiyani bekor qilib bo‘lmaydi",
      "Невозможно отменить транзакцию",
      "Transaction cannot be cancelled",
    ),
    data: "id",
  }),
};

export const PaymeErrorResponse = (
  id: PaymeRpcID,
  error: PaymeRpcError,
): PaymeRpcResponse => ({
  id,
  error,
});
