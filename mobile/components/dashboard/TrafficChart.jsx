import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import { theme } from "../../lib/theme";

export default function TrafficChart({ trend = [], isLoading = false }) {
  if (!trend.length && !isLoading) return null;

  const chartHeight = 150;
  const barWidth = 12;
  const spacing = 10;
  const chartWidth = trend.length * (barWidth + spacing);

  const max = Math.max(...trend.map((t) => t.count), 1);
  const peakIndex = trend.findIndex((t) => t.count === max);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Speed Trend</Text>
          <Text style={styles.subtitle}>Last 24 Hours</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading trend...</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg height={chartHeight + 20} width={chartWidth}>
                {[0.3, 0.6, 0.9].map((r, i) => (
                  <Line
                    key={i}
                    x1="0"
                    x2={chartWidth}
                    y1={chartHeight * r}
                    y2={chartHeight * r}
                    stroke={theme.colors.divider}
                    strokeWidth="1"
                  />
                ))}

                {trend.map((item, index) => {
                  const height = (item.count / max) * chartHeight;
                  const x = index * (barWidth + spacing);
                  const y = chartHeight - height;
                  const isPeak = index === peakIndex;

                  return (
                    <Rect
                      key={index}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={8}
                      fill={isPeak ? theme.colors.accent : theme.colors.border}
                    />
                  );
                })}
              </Svg>
            </ScrollView>
          </View>
        )}
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
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },

  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  chartContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  loadingWrap: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
});
