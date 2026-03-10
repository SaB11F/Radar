import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";
import KpiCard from "./KpiCard";

export default function KpiRow({ analytics, speedLimit = 50, isLoading = false }) {
  if (!analytics) return null;

  return (
    <View style={styles.wrap}>
      <KpiCard
        label="Vehicles"
        value={analytics.vehicles}
        hint="24h window"
        variant="primary"
        loading={isLoading}
      />

      <View style={styles.subRow}>
        <KpiCard
          label="Avg speed"
          value={analytics.avgSpeed}
          suffix="km/h"
          hint="24h window"
          variant="secondary"
          loading={isLoading}
        />

        <View style={{ width: theme.spacing.sm }} />

        <KpiCard
          label="Violations"
          value={analytics.violations}
          hint={`>${speedLimit} km/h`}
          variant="secondary"
          loading={isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  subRow: {
    flexDirection: "row",
    marginTop: theme.spacing.sm,
  },
});
