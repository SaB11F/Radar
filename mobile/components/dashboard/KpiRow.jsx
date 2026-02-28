import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";
import KpiCard from "./KpiCard";

export default function KpiRow({ kpis }) {
  return (
    <View style={styles.row}>
      <KpiCard label="Vehicles" value={kpis.vehicles} hint="Last 24h" />
      <View style={{ width: theme.spacing.sm }} />
      <KpiCard label="Avg speed" value={kpis.avgSpeed} suffix="km/h" hint="Last 24h" />
      <View style={{ width: theme.spacing.sm }} />
      <KpiCard label="Violations" value={kpis.violations} hint={`>${kpis.limitKmh} km/h`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});