import type { PlaceCategory } from "@/types/travel-place";

export type GooglePlaceResult = {
  id: string;
  name: string;
  address: string;
  country: string;
  city: string;
  category: PlaceCategory;
  estimatedCost: number | null;
  priceLabel: string;
};
