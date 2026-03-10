import { Text, TouchableOpacity, Alert, Platform } from "react-native";
import styles from "../../assets/styles/profile.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { useRouter } from "expo-router";

import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { useRadarStore } from "../../store/radarStore";

export default function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const clearData = useDataStore((s) => s.clearData);
  const resetRadar = useRadarStore((s) => s.reset);

  const handleLogout = () => {
    clearData();
    resetRadar();
    logout();
    router.replace("/(auth)");
  };
  
  const router = useRouter();

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      const shouldLogout = window.confirm("Are you sure you want to logout?");
      if (shouldLogout) handleLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => handleLogout(), style: "destructive" },
      ]);
    }
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
      <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
}
