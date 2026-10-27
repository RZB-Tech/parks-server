import { CardModel } from "../../models/postgresql/cards-model/CardModel";
import { CardAuctionDTO } from "../card-dtos/CardAuctionDto";

export const AuctionCardDTO = (card: CardModel) => ({
  id: Number(card.id),
  card: card.card,
  type: card.type,
  status: card.status,
  balance: Number(card.balance),
  ...CardAuctionDTO(card),
});
