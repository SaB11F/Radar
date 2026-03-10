import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";

import SafeScreen from "../../components/shared/SafeScreen";
import LogoutButton from "../../components/shared/LogoutButton";
import ProfileCard from "../../components/settings/ProfileCard";
import DeviceCard from "../../components/settings/DeviceCard";
import AddRadarButton from "../../components/settings/AddRadarButton";

import COLORS from "../../constants/colors";

import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { api } from "../../lib/apiClient";

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const radars = useDataStore((s) => s.radars);
  const fetchRadars = useDataStore((s) => s.fetchRadars);

  const [editRadar, setEditRadar] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRadars();
  }, [fetchRadars]);

  const handleEdit = (radar) => {
    setEditRadar(radar);
    setEditName(radar.name);
    setEditLimit(String(radar.speedLimit ?? 50));
    setEditError("");
  };

  const validateEdit = () => {
    const parsedLimit = Number(editLimit);

    if (!editName.trim()) {
      setEditError("Radar name is required.");
      return null;
    }

    if (!editLimit || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      setEditError("Speed limit must be a positive number.");
      return null;
    }

    setEditError("");
    return parsedLimit;
  };

  const handleSaveEdit = async () => {
    const parsedLimit = validateEdit();
    if (parsedLimit === null) return;

    try {
      setIsSaving(true);
      await api.patch(`/app/radars/${editRadar.radarId}`, {
        name: editName.trim(),
        speedLimit: parsedLimit,
      });

      await fetchRadars();
      setEditRadar(null);
    } catch {
      Alert.alert("Update failed", "Could not update radar right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (radar) => {
    Alert.alert("Delete Radar", `Are you sure you want to delete ${radar.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/app/radars/${radar.radarId}`);
            await fetchRadars();
          } catch {
            Alert.alert("Delete failed", "Could not delete radar right now.");
          }
        },
      },
    ]);
  };

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.profileSection}>
          <ProfileCard user={user} onEdit={() => {}} />
        </View>

        <View style={styles.section}>
          <View style={styles.devicesHeader}>
            <Text style={styles.sectionLabel}>Your Devices</Text>
            <AddRadarButton />
          </View>

          {radars.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No devices yet</Text>
              <Text style={styles.emptyText}>Add your first radar to start tracking events.</Text>
            </View>
          ) : (
            radars.map((radar) => (
              <DeviceCard
                key={radar.radarId}
                radar={radar}
                onEdit={(r) => handleEdit(r)}
                onDelete={(r) => handleDelete(r)}
              />
            ))
          )}
        </View>

        <View style={styles.logoutWrapper}>
          <LogoutButton />
        </View>
      </ScrollView>

      <Modal visible={!!editRadar} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Radar</Text>

            <TextInput
              value={editName}
              onChangeText={(text) => {
                setEditName(text);
                if (editError) setEditError("");
              }}
              style={styles.input}
              placeholder="Radar name"
              placeholderTextColor={COLORS.placeholderText}
            />

            <TextInput
              value={editLimit}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, "");
                setEditLimit(cleaned);
                if (editError) setEditError("");
              }}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="Speed limit (km/h)"
              placeholderTextColor={COLORS.placeholderText}
            />

            {!!editError && <Text style={styles.errorText}>{editError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditRadar(null)} disabled={isSaving}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
                <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },

  profileSection: {
    marginBottom: 26,
  },

  section: {
    marginTop: 8,
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  devicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },

  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  logoutWrapper: {
    marginTop: 30,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 24,
  },

  modal: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBackground,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 12,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
