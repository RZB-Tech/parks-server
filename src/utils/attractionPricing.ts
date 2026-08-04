export const CalculateAttractionSalePrice = (
  originalPrice: number,
  discountPercent: number,
) => Math.round(originalPrice * ((100 - discountPercent) / 100));
