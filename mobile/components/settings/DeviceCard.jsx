import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import COLORS from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function DeviceCard({
  radar,
  onEdit,
  onDelete,
}) {
  if (!radar) return null;

  const {
  violations = 0,
  name,
  radarId,
  createdAt,
  speedLimit = 50,
} = radar;

  return (
    <View style={styles.card}>
      {/* LEFT SIDE */}
      <View style={styles.left}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{name}</Text>

          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>
              {speedLimit} km/h
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>
          ID: {radarId}
        </Text>

        {createdAt && (
          <Text style={styles.meta}>
            Created: {new Date(createdAt).toLocaleDateString()}
          </Text>
        )}

        {violations > 0 && (
          <View style={styles.violationBadge}>
            <Ionicons
              name="warning-outline"
              size={14}
              color={COLORS.warning}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.violationText}>
              {violations} violations
            </Text>
          </View>
        )}
      </View>

      {/* RIGHT SIDE */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onEdit?.(radar)}
        >
          <Ionicons
            name="pencil"
            size={18}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: "rgba(217,74,58,0.10)" },
          ]}
          onPress={() => onDelete?.(radar)}
        >
          <Ionicons
            name="trash"
            size={18}
            color={COLORS.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    flexDirection: "row",
  },

  left: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 10,
  },

  limitBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  limitText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  violationBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,162,57,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  violationText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.warning,
  },

  actions: {
    justifyContent: "space-between",
    marginLeft: 12,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(151,168,122,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});