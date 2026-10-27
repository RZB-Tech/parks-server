export const CardAuctionDTO = (card: Pick<CardsModelI, "auction_category_id" | "auction_status">) => ({
  is_auction: card.auction_category_id != null,
  auction_category_id: card.auction_category_id == null ? null : Number(card.auction_category_id),
  auction_status: card.auction_status ?? null,
});
