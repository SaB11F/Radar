// mobile/store/dataStore.js
import { create } from "zustand";
import { api } from "../lib/apiClient";

export const useDataStore = create((set) => ({
  /*
    ---------------------------
    STATE
    ---------------------------
  */

  radars: [],
  events: [],

  analytics: {
    vehicles: 0,
    avgSpeed: 0,
    violations: 0,
    maxSpeed: 0,
    trend: [],
  },

  isLoadingRadars: false,
  isLoadingEvents: false,
  isLoadingAnalytics: false,

  error: null,

  /*
    ---------------------------
    RADARS
    ---------------------------
  */

  fetchRadars: async () => {
    set({ isLoadingRadars: true, error: null });

    try {
      const data = await api.get("/app/radars");
      const radars = Array.isArray(data) ? data : data?.radars || [];

      set({ radars });
      return radars;
    } catch (e) {
      set({ radars: [], error: e.message });
      return [];
    } finally {
      set({ isLoadingRadars: false });
    }
  },

  /*
    ---------------------------
    EVENTS (RAW DATA)
    ---------------------------
  */

  fetchEvents: async ({ radarId, limit = 20 }) => {
    set({ isLoadingEvents: true, error: null });

    try {
      const data = await api.get(
        `/app/radars/${radarId}/events?limit=${limit}`
      );

      const events = Array.isArray(data) ? data : data?.events || [];

      set({ events });
      return events;
    } catch (e) {
      set({ events: [], error: e.message });
      return [];
    } finally {
      set({ isLoadingEvents: false });
    }
  },

  /*
    ---------------------------
    ANALYTICS (AGGREGATED DATA)
    ---------------------------
  */

  fetchAnalytics: async ({ radarId, range = "24h" }) => {
    set({ isLoadingAnalytics: true, error: null });

    try {
      const data = await api.get(
        `/app/radars/${radarId}/analytics?range=${range}`
      );

      set({ analytics: data });
      return data;
    } catch (e) {
      set({
        analytics: {
          vehicles: 0,
          avgSpeed: 0,
          violations: 0,
          maxSpeed: 0,
          trend: [],
        },
        error: e.message,
      });
      return null;
    } finally {
      set({ isLoadingAnalytics: false });
    }
  },

  /*
    ---------------------------
    RESET
    ---------------------------
  */

  clearData: () =>
    set({
      radars: [],
      events: [],
      analytics: {
        vehicles: 0,
        avgSpeed: 0,
        violations: 0,
        maxSpeed: 0,
        trend: [],
      },
      error: null,
    }),
}));