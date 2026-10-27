import { auctionCategorySchema } from "../../auction-category-routes/schema";
import { successAnswerTemplate } from "../../schemas";

export const getClientAuctionCategoriesSchema = {
  tags: ["Clients|Auction categories"],
  summary: "Get active auction categories",
  description: "Returns active, non-deleted categories ordered by price ascending.",
  security: [{ InitDataHeader: [] }],
  response: {
    200: successAnswerTemplate({
      categories: { type: "array", items: auctionCategorySchema },
    }),
  },
};
