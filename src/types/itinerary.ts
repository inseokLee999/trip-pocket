export type ItineraryCategory =
  | "transport"
  | "sightseeing"
  | "food"
  | "stay"
  | "shopping"
  | "other";

export type ItineraryItem = {
  id: string;
  tripName: string;
  title: string;
  location: string;
  category: ItineraryCategory;
  planDate: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  memo: string;
  createdAt: string;
};

export type ItineraryDraft = Omit<ItineraryItem, "id" | "createdAt">;

export const itineraryCategories: ItineraryCategory[] = [
  "transport",
  "sightseeing",
  "food",
  "stay",
  "shopping",
  "other",
];

export function isItineraryCategory(value: unknown): value is ItineraryCategory {
  return typeof value === "string" && itineraryCategories.includes(value as ItineraryCategory);
}
