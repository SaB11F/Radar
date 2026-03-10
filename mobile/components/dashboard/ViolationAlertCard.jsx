import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

export default function ViolationAlertCard({ analytics }) {
  if (!analytics || analytics.violations === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={18} color={theme.colors.white} />
          </View>

          <View>
            <Text style={styles.label}>Violation Alert</Text>
            <Text style={styles.value}>Highest speed: {analytics.maxSpeed} km/h</Text>
          </View>
        </View>

        <TouchableOpacity>
          <Text style={styles.view}>VIEW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },

  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  label: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: theme.colors.accent,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  value: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 4,
  },

  view: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});
