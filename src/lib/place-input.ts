import {
  isPlaceCategory,
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
  const visitDate = typeof input.visitDate === "string" ? input.visitDate : "";

  if (!name || !country || !city) return null;
  if (!isPlaceCategory(input.category) || !isPlaceStatus(input.status)) return null;
  if (visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return null;

  return {
    name: name.slice(0, 120),
    country: country.slice(0, 80),
    city: city.slice(0, 80),
    category: input.category,
    status: input.status,
    visitDate,
    memo: memo.slice(0, 2_000),
  };
}
