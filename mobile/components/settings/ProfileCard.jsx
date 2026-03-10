import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import COLORS from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileCard({ user, onEdit }) {
  if (!user) return null;

  const displayName = user.username || user.name || "User";
  const avatarUri =
    user.profileImage ||
    user.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri: avatarUri,
          }}
          style={styles.avatar}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{displayName}</Text>

          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        </View>

        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Edit */}
      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
        <Ionicons name="pencil" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  avatarWrapper: {
    marginRight: 16,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  info: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 8,
  },

  proBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },

  proText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(151,168,122,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
