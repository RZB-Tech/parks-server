# Auction categories

Categories define a fixed card sale price in whole UZS. The sale price is separate
from a card's balance. This API manages categories and card listings. Purchasing,
payment processing and sales reports are a separate implementation stage.

The `auction_categories` table is registered with Sequelize and created by the
existing `sequelize.sync()` startup flow. Categories use soft deletion. The
idempotent `EnsureCardAuctionSchema` startup step adds the auction columns,
foreign key, state constraint and lookup index to existing card tables.

## Dashboard

All routes require `Authorization: Bearer <access-token>` and an employee with
the `superadmin` or `director` role. Other employee roles receive `403`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auction-categories` | Create a category |
| GET | `/api/v1/auction-categories` | List categories |
| GET | `/api/v1/auction-categories/:categoryID` | Read one category |
| PUT | `/api/v1/auction-categories/:categoryID` | Update supplied fields |
| DELETE | `/api/v1/auction-categories/:categoryID` | Soft delete one category |

Create request:

```json
{
  "data": {
    "name": "Premium raqamlar",
    "price": 300000,
    "is_active": true
  }
}
```

`name` and `price` are required on creation. `name` is trimmed and must contain
1–255 characters after trimming. `price` must be a positive safe integer
(maximum `9007199254740991`). `is_active` defaults to `true`.

Update accepts any non-empty subset of these three fields:

```json
{
  "data": {
    "price": 1000000,
    "is_active": false
  }
}
```

Create, read and update return:

```json
{
  "statusCode": 200,
  "data": {
    "category": {
      "id": 1,
      "name": "Premium raqamlar",
      "price": 300000,
      "is_active": true
    }
  }
}
```

List supports `search` (case-insensitive name search), `is_active`, `page`
(default `1`) and `limit` (default `10`, maximum `100`). It returns
`data.categories` and `data.pagination` with `total`, `page`, `limit` and
`totalPages`. Results are ordered by `price ASC, id ASC`.

Delete returns `{"statusCode":200,"data":{"success":true}}`. Missing and
previously deleted categories return `404` on read, update and delete. A category
with assigned cards (including sold or soft-deleted cards) returns `409`
`AUCTION_CATEGORY_HAS_CARDS`; remove its eligible listings first. Disabling a
category hides its cards from clients while preserving their assignment.

## Card assignment

Only `superadmin` and `director` may use these dashboard routes:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auction-categories/cards` | Assign a batch of cards |
| DELETE | `/api/v1/auction-categories/cards` | Remove a batch of listed cards |
| GET | `/api/v1/auction-categories/:categoryID/cards` | List category cards |

POST and DELETE accept the same body:

```json
{
  "data": {
    "auctionCategoryID": 1,
    "cards": ["000123", "000456", "000789"]
  }
}
```

Send 1–500 card numbers as strings. Leading zeros are preserved; surrounding
whitespace is trimmed and duplicate numbers are rejected. Cards must already
exist, be non-deleted, `inactive` and have no assigned user. Assignment also
requires an active category and no existing auction assignment. Both same-category
and different-category reassignments are rejected.

The entire batch is validated before writing. Assignment and removal run in one
transaction with category/card row locks. Any validation or write failure rolls
back the batch. Validation errors return `400` with an `errors` array, for example:

```json
{
  "statusCode": 400,
  "message": "AUCTION_CARDS_VALIDATION_FAILED",
  "errors": [
    { "card": "000456", "code": "CARD_NOT_INACTIVE" },
    { "card": "000789", "code": "CARD_ALREADY_BOUND" }
  ]
}
```

Other card-level errors include `CARD_NOT_FOUND`, `CARD_ALREADY_IN_AUCTION`,
`DUPLICATE_CARD_NUMBER`, `CARD_NOT_IN_THIS_AUCTION_CATEGORY` and
`ONLY_LISTED_CARDS_CAN_BE_REMOVED`. A missing category returns `404`; assignment
to an inactive category returns `400` `AUCTION_CATEGORY_IS_INACTIVE`.

POST returns `data.cards` with the assigned category and `auction_status: listed`.
The card's existing type, inactive status, user, balance and batch counters remain
unchanged. Example card:

```json
{
  "id": 1,
  "card": "000123",
  "type": "classic",
  "status": "inactive",
  "balance": 0,
  "is_auction": true,
  "auction_category_id": 1,
  "auction_status": "listed"
}
```

DELETE requires cards to belong to the supplied category and still be `listed`,
inactive and unbound. It also works on disabled categories. It clears both auction
fields and returns the updated cards. Reserved and sold cards cannot be removed.

The dashboard category-card list supports `search` (card number), `auction_status`
(`listed`, `reserved`, `sold`), `page` (default `1`, maximum `1000000`) and `limit`
(default `10`, maximum `100`). It returns `data.category`, `data.cards` and
`data.pagination`. Cards are sorted by card number, then ID.

Ordinary dashboard `GET /api/v1/cards` also returns auction metadata and accepts
`is_auction`, `auction_category_id` and `auction_status` filters. The NFC lookup
and client-owned card responses include the same metadata.

Listed/reserved cards are blocked from ordinary top-up/activation, manual card
editing, Telegram binding and use as a replacement card. Remove a listed card
from its category before ordinary use. Cards with auction history cannot be hard
deleted. Sold cards retain their category/status and may use ordinary card features.

Listing is not a sale. These endpoints cannot mark a card reserved/sold, attach a
buyer, collect money or increase revenue totals. A future checkout must save an
immutable sale record containing the actual price and category/card snapshots;
historical sales reports must use that record rather than the category's current
price.

## Telegram Mini App

`GET /api/v1/client/auction-categories` requires the existing
`x-telegram-init-data` authentication header. It returns all active, non-deleted
categories in ascending price order as `data.categories`, without pagination.
Clients cannot create, update or delete categories.

`GET /api/v1/client/auction-categories/:categoryID/cards` uses the same Telegram
authentication. It returns only non-deleted, listed, inactive, unbound cards in
an active category. Reserved/sold cards are excluded and an inactive or deleted
category returns `404`. Supports `search`, `page` and `limit`, and returns
`data.category`, `data.cards` and `data.pagination`. NFC IDs and bind tokens are
never exposed by these auction listing endpoints.

The routes and request/response schemas are also available in Swagger.

## Verification

Run `npm run build` and `npm test`. The PostgreSQL integration test is opt-in:

```sh
AUCTION_TEST_DATABASE_URL='postgresql://user:password@localhost/testdb' \
  node --test -r ts-node/register/transpile-only tests/auction-cards.integration.test.ts
```

Integration fixtures are created and removed in an isolated schema. The test
checks fresh and existing-table bootstrapping, repeated schema setup, rollback,
competing assignments, database constraints and client visibility.
