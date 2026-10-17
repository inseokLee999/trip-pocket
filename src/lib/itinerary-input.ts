import { isItineraryCategory, type ItineraryDraft } from "@/types/itinerary";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseItineraryDraft(value: unknown): ItineraryDraft | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const tripName = typeof input.tripName === "string" ? input.tripName.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const planDate = typeof input.planDate === "string" ? input.planDate : "";
  const startTime = typeof input.startTime === "string" ? input.startTime : "";
  const endTime = typeof input.endTime === "string" ? input.endTime : "";
  const memo = typeof input.memo === "string" ? input.memo.trim() : "";
  const estimatedCost = typeof input.estimatedCost === "number" ? input.estimatedCost : Number(input.estimatedCost);

  if (!tripName || !title || !location || !/^\d{4}-\d{2}-\d{2}$/.test(planDate)) return null;
  if (!isItineraryCategory(input.category)) return null;
  if ((startTime && !timePattern.test(startTime)) || (endTime && !timePattern.test(endTime))) return null;
  if (!Number.isInteger(estimatedCost) || estimatedCost < 0 || estimatedCost > 100_000_000) return null;

  return {
    tripName: tripName.slice(0, 80),
    title: title.slice(0, 120),
    location: location.slice(0, 200),
    category: input.category,
    planDate,
    startTime,
    endTime,
    estimatedCost,
    memo: memo.slice(0, 2_000),
  };
}
