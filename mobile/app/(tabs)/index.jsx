import React, { useEffect, useMemo } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { theme } from "../../lib/theme";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiRow from "../../components/dashboard/KpiRow";
import RecentEventsList from "../../components/dashboard/RecentEventsList";
import { useRadarStore } from "../../store/radarStore";
import { useDataStore } from "../../store/dataStore";

export default function DashboardScreen() {
  const selectedRadarId = useRadarStore((s) => s.selectedRadarId);

  const radars = useDataStore((s) => s.radars);
  const events = useDataStore((s) => s.events);
  const kpis = useDataStore((s) => s.kpis);
  const fetchRadars = useDataStore((s) => s.fetchRadars);
  const fetchEvents = useDataStore((s) => s.fetchEvents);
  const isLoadingRadars = useDataStore((s) => s.isLoadingRadars);
  const isLoadingEvents = useDataStore((s) => s.isLoadingEvents);

  // 1) load radars on mount
  useEffect(() => {
    fetchRadars();
  }, []);

  // 2) whenever selected radar changes -> load events
  useEffect(() => {
    const fallbackRadar = radars?.[0]?.radarId;
    const radarIdToLoad =
      !selectedRadarId || selectedRadarId === "ALL" ? fallbackRadar : selectedRadarId;

    if (radarIdToLoad) fetchEvents({ radarId: radarIdToLoad, limit: 50 });
  }, [selectedRadarId, radars?.length]);

  const refreshing = isLoadingRadars || isLoadingEvents;

  const visibleEvents = useMemo(() => {
    // Če selected = ALL, trenutno kaže events za fallback radar (MVP).
    // Kasneje lahko naredimo backend endpoint "events for all radars".
    return events;
  }, [events]);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              await fetchRadars();
              const radarId = radars?.[0]?.radarId;
              if (radarId) await fetchEvents({ radarId, limit: 50 });
            }}
          />
        }
      >
        <DashboardHeader radars={radars} />
        <KpiRow kpis={kpis} />
        <RecentEventsList events={visibleEvents} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});