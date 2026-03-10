import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import COLORS from "../../constants/colors";
import { useDataStore } from "../../store/dataStore";
import { api } from "../../lib/apiClient";

export default function AddRadarButton() {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdRadar, setCreatedRadar] = useState(null);

  const fetchRadars = useDataStore((s) => s.fetchRadars);

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      setLoading(true);
      const created = await api.post("/app/radars", { name: name.trim() });
      await fetchRadars();

      setVisible(false);
      setName("");
      setCreatedRadar(created);
    } catch {
      Alert.alert("Create failed", "Could not create radar right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <Text style={styles.buttonText}>+ Add Radar</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add New Radar</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Radar name"
              placeholderTextColor={COLORS.placeholderText}
              style={styles.input}
            />

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCreate} disabled={loading}>
                <Text style={styles.create}>{loading ? "Creating..." : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!createdRadar} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Radar Created</Text>
            <Text style={styles.metaLabel}>Radar ID</Text>
            <Text selectable style={styles.metaValue}>
              {createdRadar?.radarId || "-"}
            </Text>

            {!!createdRadar?.deviceKey && (
              <>
                <Text style={styles.metaLabel}>Device Key (shown once)</Text>
                <Text selectable style={styles.metaValue}>
                  {createdRadar.deviceKey}
                </Text>
              </>
            )}

            <Text style={styles.helpText}>Long press text to copy.</Text>

            <View style={styles.actions}>
              <View />
              <TouchableOpacity onPress={() => setCreatedRadar(null)}>
                <Text style={styles.create}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "600",
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
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    color: COLORS.textPrimary,
    marginBottom: 20,
  },

  metaLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 4,
    textTransform: "uppercase",
  },

  metaValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },

  helpText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  cancel: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  create: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
