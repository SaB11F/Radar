import { create } from "zustand";

export const useRadarStore = create((set) => ({
  selectedRadarId: null,
  setSelectedRadarId: (radarId) => set({ selectedRadarId: radarId }),
  reset: () => set({ selectedRadarId: null }),
}));