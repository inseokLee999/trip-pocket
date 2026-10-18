export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export type TripDraft = Omit<Trip, "id" | "createdAt">;
