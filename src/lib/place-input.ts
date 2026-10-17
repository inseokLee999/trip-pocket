import {
  isPlaceCategory,
  isPlacePriority,
  isPlaceStatus,
  type PlaceDraft,
} from "@/types/travel-place";

export function parsePlaceDraft(value: unknown): PlaceDraft | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const country = typeof input.country === "string" ? input.country.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const memo = typeof input.memo === "string" ? input.memo.trim() : "";
  const tripName = typeof input.tripName === "string" ? input.tripName.trim() : "";
  const estimatedCost = typeof input.estimatedCost === "number" ? input.estimatedCost : Number(input.estimatedCost);
  const visitDate = typeof input.visitDate === "string" ? input.visitDate : "";

  if (!name || !country || !city || !tripName) return null;
  if (!isPlaceCategory(input.category) || !isPlaceStatus(input.status) || !isPlacePriority(input.priority)) return null;
  if (visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return null;
  if (!Number.isInteger(estimatedCost) || estimatedCost < 0 || estimatedCost > 100_000_000) return null;

  return {
    name: name.slice(0, 120),
    country: country.slice(0, 80),
    city: city.slice(0, 80),
    category: input.category,
    status: input.status,
    tripName: tripName.slice(0, 80),
    priority: input.priority,
    estimatedCost,
    visitDate,
    memo: memo.slice(0, 2_000),
  };
}
