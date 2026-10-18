import type { TripDraft } from "@/types/trip";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseTripDraft(value: unknown): TripDraft | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const destination = typeof input.destination === "string" ? input.destination.trim() : "";
  const startDate = typeof input.startDate === "string" ? input.startDate : "";
  const endDate = typeof input.endDate === "string" ? input.endDate : "";

  if (!name || !datePattern.test(startDate) || !datePattern.test(endDate) || endDate < startDate) return null;

  return {
    name: name.slice(0, 80),
    destination: destination.slice(0, 120),
    startDate,
    endDate,
  };
}
