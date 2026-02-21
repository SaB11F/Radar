import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";

import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import styles from "../../assets/styles/create.styles";
import { Ionicons } from "@expo/vector-icons";

import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";

import { useLocalSearchParams } from "expo-router";

export default function Create() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const { imageUrl } = useLocalSearchParams();

  const router = useRouter();
  const { token } = useAuthStore();

  // 🔥 Get user location when screen opens
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need location to create tasks.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    })();
  }, []);

  const handleSubmit = async () => {
    const finalImage = imageUrl || null;

    if (!title || !caption || !finalImage) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!coords) {
      Alert.alert("Error", "Location not ready yet");
      return;
    }

    try {
      setLoading(true);

      const tokenClean = token?.trim();
      if (!tokenClean) throw new Error("No token available");

      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenClean}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          caption,
          image: finalImage,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong");

      Alert.alert("Success", "Task created!");
      setTitle("");
      setCaption("");
      router.push("/(tabs)");
      
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Task</Text>
            <Text style={styles.subtitle}>It will be saved with your location.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/camera")}
        >
          <Ionicons name="camera-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 120, height: 120, borderRadius: 10, marginTop: 10 }}
          />
        )}


        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="clipboard-outline"
                size={20}
                color="#688f68"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Task title"
                placeholderTextColor="#767676"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Task description"
              placeholderTextColor="#767676"
              value={caption}
              onChangeText={setCaption}
              multiline
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading || !coords}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {coords ? "Create Task" : "Getting location..."}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}