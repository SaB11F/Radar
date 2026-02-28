import React, { useMemo } from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { theme } from "../../lib/theme";
import { useRadarStore } from "../../store/radarStore";

export default function DeviceSelector({ radars = [] }) {
  const selectedRadarId = useRadarStore((s) => s.selectedRadarId);
  const setSelectedRadarId = useRadarStore((s) => s.setSelectedRadarId);

  const options = useMemo(() => {
    const base = [{ radarId: "ALL", name: "All devices" }];
    const list = radars.map((r) => ({ radarId: r.radarId, name: r.name || r.radarId }));
    return [...base, ...list];
  }, [radars]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = selectedRadarId === opt.radarId;
          return (
            <Pressable
              key={opt.radarId}
              onPress={() => setSelectedRadarId(opt.radarId)}
              style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
            >
              <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextIdle]}>
                {opt.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
  },
  pillIdle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: { fontWeight: "700" },
  pillTextIdle: { color: theme.colors.textPrimary },
  pillTextActive: { color: theme.colors.white },
});