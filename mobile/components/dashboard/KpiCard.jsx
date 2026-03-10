import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../shared/Card";
import { theme } from "../../lib/theme";

export default function KpiCard({
  label,
  value,
  suffix = "",
  hint = "",
  variant = "secondary",
  loading = false,
}) {
  const isPrimary = variant === "primary";
  return (
    <Card style={[styles.card, isPrimary ? styles.primaryCard : styles.secondaryCard]}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{loading ? "--" : value}</Text>
        {!loading && suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>

      {hint ? <Text style={styles.hint}>{loading ? "Loading..." : hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 24,
  },
  primaryCard: {
    backgroundColor: theme.colors.cardBackground,
  },
  secondaryCard: {
    backgroundColor: theme.colors.background,
  },
  label: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  value: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  suffix: {
    marginLeft: 6,
    color: theme.colors.textSecondary,
    fontWeight: "800",
    fontSize: 14,
  },
  hint: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
