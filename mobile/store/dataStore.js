// mobile/store/dataStore.js
import { create } from "zustand";
import { api } from "../lib/apiClient";

const calcKpis = (events, limitKmh = 50) => {
  const vehicles = events.length;
  const avgSpeed =
    vehicles === 0
      ? 0
      : Math.round((events.reduce((acc, e) => acc + (e.speedKmh || 0), 0) / vehicles) * 10) / 10;

  const violations = events.filter((e) => (e.speedKmh || 0) > limitKmh).length;
  return { vehicles, avgSpeed, violations, limitKmh };
};

export const useDataStore = create((set, get) => ({
  radars: [],
  events: [],
  kpis: { vehicles: 0, avgSpeed: 0, violations: 0, limitKmh: 50 },

  isLoadingRadars: false,
  isLoadingEvents: false,
  error: null,

  fetchRadars: async () => {
    set({ isLoadingRadars: true, error: null });
    try {
      // pričakovan endpoint:
      // GET /api/app/radars
      const data = await api.get("/app/radars");
      // če backend vrača { radars: [...] } ali kar [...]
      const radars = Array.isArray(data) ? data : data?.radars || [];
      set({ radars });
      return radars;
    } catch (e) {
      set({
        radars: [],
        error: e.message,
      });
      return [];
    } finally {
      set({ isLoadingRadars: false });
    }
  },

  fetchEvents: async ({ radarId, limit = 50 }) => {
    set({ isLoadingEvents: true, error: null });
    try {
      // pričakovan endpoint:
      // GET /api/app/radars/:radarId/events?limit=50
      const data = await api.get(`/app/radars/${radarId}/events?limit=${limit}`);
      const events = Array.isArray(data) ? data : data?.events || [];
      // normalizacija violation flag-a (optional)
      const limitKmh = get().kpis?.limitKmh ?? 50;
      const normalized = events.map((e) => ({
        ...e,
        isViolation: (e.speedKmh || 0) > limitKmh,
      }));

      set({ events: normalized, kpis: calcKpis(normalized, limitKmh) });
      return normalized;
    } catch (e) {
      set({
        events: [],
        kpis: { vehicles: 0, avgSpeed: 0, violations: 0, limitKmh: 50 },
        error: e.message,
      });
      return [];
    } finally {
      set({ isLoadingEvents: false });
    }
  },

  setSpeedLimit: (limitKmh) => {
    const events = get().events;
    set({ kpis: calcKpis(events, limitKmh) });
  },

  clearData: () => set({ radars: [], events: [], kpis: { vehicles: 0, avgSpeed: 0, violations: 0, limitKmh: 50 } }),
}));