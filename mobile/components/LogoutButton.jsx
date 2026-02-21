import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import styles from "../assets/styles/profile.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { useRouter } from "expo-router";

export default function LogoutButton() {
  const { logout } = useAuthStore();

  const router = useRouter();

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      const shouldLogout = window.confirm("Are you sure you want to logout?");
      if (shouldLogout) logout();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => logout(), style: "destructive" },
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