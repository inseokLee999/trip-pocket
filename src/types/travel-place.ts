export type PlaceStatus = "wishlist" | "visited";
export type PlacePriority = "must" | "interested" | "later";

export type PlaceCategory =
  | "관광지"
  | "자연"
  | "맛집"
  | "숙소"
  | "휴양"
  | "기타";

export type TravelPlace = {
  id: string;
  name: string;
  country: string;
  city: string;
  category: PlaceCategory;
  status: PlaceStatus;
  tripName: string;
  priority: PlacePriority;
  estimatedCost: number;
  visitDate: string;
  memo: string;
  createdAt: string;
};

export type PlaceDraft = Omit<TravelPlace, "id" | "createdAt">;

export const placeCategories: PlaceCategory[] = [
  "관광지",
  "자연",
  "맛집",
  "숙소",
  "휴양",
  "기타",
];

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return typeof value === "string" && placeCategories.includes(value as PlaceCategory);
}

export function isPlaceStatus(value: unknown): value is PlaceStatus {
  return value === "wishlist" || value === "visited";
}

export function isPlacePriority(value: unknown): value is PlacePriority {
  return value === "must" || value === "interested" || value === "later";
}
