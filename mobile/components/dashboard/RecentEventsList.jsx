import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Card from "../shared/Card";
import { theme } from "../../lib/theme";

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function RecentEventsList({ events = [], onPressItem }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent events</Text>
        <Text style={styles.sub}>{events.length}</Text>
      </View>

      <Card style={{ padding: 0 }}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No events yet.</Text>
          </View>
        ) : (
          events.map((e, idx) => (
            <Pressable
              key={e.eventId || idx}
              onPress={() => onPressItem?.(e)}
              style={[styles.item, idx !== events.length - 1 && styles.divider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTop}>
                  {e.radarName || e.radarId || "Radar"} • {formatTime(e.capturedAt)}
                </Text>
                <Text style={styles.itemBottom}>
                  {e.speedKmh} km/h
                  {typeof e.limitKmh === "number" && e.speedKmh > e.limitKmh ? "  •  Violation" : ""}
                </Text>
              </View>

              <View style={[styles.pill, e.isViolation ? styles.pillBad : styles.pillOk]}>
                <Text style={[styles.pillText, e.isViolation ? styles.pillTextBad : styles.pillTextOk]}>
                  {e.isViolation ? "!" : "OK"}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: theme.spacing.sm },
  title: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  sub: { color: theme.colors.textSecondary, fontWeight: "700" },

  empty: { padding: theme.spacing.lg },
  emptyText: { color: theme.colors.textSecondary, fontWeight: "600" },

  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },

  itemTop: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700" },
  itemBottom: { marginTop: 6, color: theme.colors.textPrimary, fontSize: 16, fontWeight: "900" },

  pill: { minWidth: 44, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  pillOk: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  pillBad: { backgroundColor: "#FFA239", borderWidth: 1, borderColor: "#FFA239" }, // tvoj orange iz palete

  pillText: { fontWeight: "900" },
  pillTextOk: { color: theme.colors.textPrimary },
  pillTextBad: { color: theme.colors.black },
});