declare interface AuctionCategoryParams {
  categoryID: number;
}

declare interface GetAuctionCategoriesQuery {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

declare interface CreateAuctionCategoryData {
  name: string;
  price: number;
  is_active?: boolean;
}

declare type UpdateAuctionCategoryData = Partial<CreateAuctionCategoryData>;

declare interface AuctionCategoryCardsData {
  auctionCategoryID: number;
  cards: string[];
}

declare interface GetAuctionCategoryCardsQuery {
  search?: string;
  auction_status?: import("../../models/postgresql/cards-model/enums").AuctionCardStatus;
  page?: number;
  limit?: number;
}
