import { BadRequest } from "../exceptions";
import { AuctionCardStatus } from "../models/postgresql/cards-model/enums";

type AuctionCard = {
  auction_category_id?: number | null;
  auction_status?: AuctionCardStatus | null;
};

// Sold cards can use ordinary card features. Listing or reserving a card must
// never activate it or attach it to a user through the ordinary card flows.
export const AssertCardOutsideAuction = (card: AuctionCard) => {
  if (
    (card.auction_category_id != null || card.auction_status != null) &&
    card.auction_status !== AuctionCardStatus.SOLD
  ) {
    throw BadRequest("CARD_RESERVED_FOR_AUCTION");
  }
};
