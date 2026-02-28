// mobile/app/(tabs)/profile.jsx
import React from "react";
import { View, Text } from "react-native";
import SafeScreen from "../../components/shared/SafeScreen";
import LogoutButton from "../../components/shared/LogoutButton";
import colors from "../../constants/colors";

export default function ProfileScreen() {
  return (
    <SafeScreen>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text ?? "#fff" }}>
          Settings
        </Text>

        <View
          style={{
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border ?? "rgba(255,255,255,0.12)",
            backgroundColor: colors.card ?? "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ color: colors.mutedText ?? "rgba(255,255,255,0.75)" }}>
            TODO: Profile panel (username/email/avatar)
          </Text>
          <Text style={{ color: colors.mutedText ?? "rgba(255,255,255,0.75)", marginTop: 6 }}>
            TODO: Devices list (rename/delete) + Add device
          </Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <LogoutButton />
        </View>
      </View>
    </SafeScreen>
  );
}