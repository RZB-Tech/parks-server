# Central Park — Uzum Merchant API

Коллекция реализует входящие вебхуки Uzum Merchant API согласно официальной документации:

- `POST /check`
- `POST /create`
- `POST /confirm`
- `POST /reverse`
- `POST /status`

## Base URL

```text
https://api.dev.wonder-walk.uz/api/v1/payments/uzum
```

Все запросы используют `Content-Type: application/json` и HTTP Basic Authentication. Тела и ответы передаются без дополнительной обёртки `data`.

## Переменные

| Переменная | Описание |
|---|---|
| `base_url` | Полный базовый URL без завершающего `/` |
| `basic_username` | Логин, настроенный на backend |
| `basic_password` | Пароль, настроенный на backend |
| `service_id` | Тестовый ServiceId; после приёмки заменяется значением Uzum |
| `order_id` | Идентификатор заранее созданного заказа Central Park |
| `amount_tiyin` | Сумма заказа в тийинах: сумма в UZS × 100 |
| `trans_id` | UUID транзакции Uzum; генерируется автоматически, если пустой |
| `timestamp` | Unix timestamp в миллисекундах; обновляется перед каждым запросом |

## Подготовка тестового заказа

Заказ создаётся из Telegram Mini App через:

```http
POST /api/v1/client/payments/uzum
```

```json
{
  "data": {
    "card": 44,
    "amount": 10000
  }
}
```

В Postman необходимо перенести `data.payment.order_id` в `order_id`, а сумму умножить на 100 и указать в `amount_tiyin`.

## Порядок запуска

1. `check` — должен вернуть `status: OK`.
2. `create` — должен вернуть `status: CREATED`.
3. `confirm` — должен вернуть `status: CONFIRMED`; баланс карты увеличивается один раз.
4. `status` — должен вернуть `status: CONFIRMED`.
5. `reverse` — должен вернуть `status: REVERSED`; подтверждённое пополнение возвращается, если на карте достаточно средств.

Повторный `create`, `confirm` или `reverse` возвращает HTTP 400 и соответствующий `errorCode` из спецификации Uzum. Неверная Basic Authentication возвращает `10001`, неверный `serviceId` — `10006`, неизвестный `order_id` — `10007`, неизвестный `transId` — `10014`.

`order_id` передаётся только во входном `params` запросов `check` и `create`. Объект `data` возвращается только методами `check` и `status`, без `order_id`; в нём остаются сумма и маскированный номер карты. Ответы `create`, `confirm` и `reverse` не содержат объект `data`.

## Backend environment

```dotenv
UZUM_ENABLED=true
UZUM_MERCHANT_USERNAME=
UZUM_MERCHANT_PASSWORD=
UZUM_MERCHANT_SERVICE_ID=101202
UZUM_MERCHANT_PAYMENT_URL=
UZUM_MERCHANT_ACCOUNT_PARAM=order_id
UZUM_ORDER_EXPIRES_MINUTES=30
UZUM_CONFIRM_TIMEOUT_MINUTES=30
UZUM_EXPIRATION_DISABLED=false
```

`UZUM_MERCHANT_PAYMENT_URL` будет заполнен рабочей ссылкой, которую Uzum предоставит после проверки Postman-коллекции. Можно использовать URL с шаблоном `{order_id}` либо обычный URL — тогда backend добавит query-параметр из `UZUM_MERCHANT_ACCOUNT_PARAM`.

Для временного тестирования без срока действия заказа и без таймаута между `create` и `confirm` установите `UZUM_EXPIRATION_DISABLED=true`. В рабочем окружении флаг должен быть `false`.
