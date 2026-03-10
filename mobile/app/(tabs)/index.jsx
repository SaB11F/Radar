import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { theme } from "../../lib/theme";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiRow from "../../components/dashboard/KpiRow";
import TrafficChart from "../../components/dashboard/TrafficChart";
import ViolationAlertCard from "../../components/dashboard/ViolationAlertCard";
import RecentEventsList from "../../components/dashboard/RecentEventsList";

import { useRadarStore } from "../../store/radarStore";
import { useDataStore } from "../../store/dataStore";

export default function DashboardScreen() {
  const selectedRadarId = useRadarStore((s) => s.selectedRadarId);
  const setSelectedRadarId = useRadarStore((s) => s.setSelectedRadarId);

  const radars = useDataStore((s) => s.radars);
  const events = useDataStore((s) => s.events);
  const analytics = useDataStore((s) => s.analytics);

  const fetchRadars = useDataStore((s) => s.fetchRadars);
  const fetchEvents = useDataStore((s) => s.fetchEvents);
  const fetchAnalytics = useDataStore((s) => s.fetchAnalytics);

  const isLoadingRadars = useDataStore((s) => s.isLoadingRadars);
  const isLoadingEvents = useDataStore((s) => s.isLoadingEvents);
  const isLoadingAnalytics = useDataStore((s) => s.isLoadingAnalytics);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const refreshing =
    isLoadingRadars || isLoadingEvents || isLoadingAnalytics;
  const isDashboardLoading = isLoadingAnalytics || isLoadingEvents;

  const fetchRadarData = useCallback(
    async (radarId) => {
      if (!radarId) return;

      await Promise.all([
        fetchAnalytics({ radarId }),
        fetchEvents({ radarId, limit: 20 }),
      ]);

      setLastUpdatedAt(new Date());
    },
    [fetchAnalytics, fetchEvents]
  );

  useEffect(() => {
    fetchRadars();
  }, [fetchRadars]);

  useEffect(() => {
    if (radars.length > 0 && !selectedRadarId) {
      const firstRadarId = radars[0].radarId;
      setSelectedRadarId(firstRadarId);
    }
  }, [radars, selectedRadarId, setSelectedRadarId]);

  useEffect(() => {
    if (!selectedRadarId) return;

    fetchRadarData(selectedRadarId);
  }, [selectedRadarId, fetchRadarData]);

  const selectedRadar = useMemo(
    () => radars.find((r) => r.radarId === selectedRadarId) || null,
    [radars, selectedRadarId]
  );

  const activeRadar = selectedRadar || radars[0] || null;

  const visibleEvents = useMemo(() => {
    const limitKmh = activeRadar?.speedLimit ?? 50;
    const radarName = activeRadar?.name;
    return events.map((event) => ({
      ...event,
      limitKmh,
      radarName: radarName || event.radarName || event.radarId,
      isViolation: typeof event.speedKmh === "number" ? event.speedKmh > limitKmh : false,
    }));
  }, [events, activeRadar]);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              const radarId = activeRadar?.radarId;
              if (!radarId) return;

              await fetchRadarData(radarId);
            }}
          />
        }
      >
        <DashboardHeader
          radars={radars}
          selectedRadar={activeRadar}
          lastUpdatedAt={lastUpdatedAt}
        />
        
        <KpiRow
          analytics={analytics}
          speedLimit={activeRadar?.speedLimit ?? 50}
          isLoading={isDashboardLoading && !!activeRadar}
        />

        <TrafficChart trend={analytics?.trend} isLoading={isLoadingAnalytics && !!activeRadar} />

        <ViolationAlertCard analytics={analytics} />

        <RecentEventsList events={visibleEvents} isLoading={isLoadingEvents && !!activeRadar} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
