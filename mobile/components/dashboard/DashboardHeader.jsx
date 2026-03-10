import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../shared/Card";
import { theme } from "../../lib/theme";
import DeviceSelector from "./DeviceSelector";

function formatUpdatedAt(date) {
  if (!date) return "Not synced yet";
  return `Updated ${new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function DashboardHeader({ radars = [], selectedRadar, lastUpdatedAt }) {
  const speedLimit = selectedRadar?.speedLimit ?? 50;

  return (
    <View style={styles.wrap}>
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DEMO</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Select a device to view analytics.</Text>

        <View style={{ marginTop: theme.spacing.sm }}>
          <DeviceSelector radars={radars} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Limit: {speedLimit} km/h</Text>
          <Text style={styles.metaText}>{formatUpdatedAt(lastUpdatedAt)}</Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.textPrimary },
  subtitle: { marginTop: 8, color: theme.colors.textSecondary },
  metaRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: theme.colors.white },
});
