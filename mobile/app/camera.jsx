import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import styles from "../assets/styles/camera.styles";

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const onCameraReady = () => setIsCameraReady(true);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    const data = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: true,
      skipProcessing: true,
    });

    if (!data?.base64) {
      alert("Failed to capture image.");
      return;
    }

    setPhoto(data);
    setPreview(true);
  };

  const retake = () => {
    setPreview(false);
    setPhoto(null);
  };

  const confirmPhoto = async () => {
    if (isUploading) return;
    if (!photo?.base64) {
      alert("No photo to upload.");
      return;
    }

    try {
    setIsUploading(true);

    const base64Img = `data:image/jpg;base64,${photo.base64}`;

    const uploadData = {
      file: base64Img,
      upload_preset: "task_upload",
    };

      const res = await fetch("https://api.cloudinary.com/v1_1/dxn3z7shy/image/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(uploadData),
      });

      const json = await res.json();

      if (!json.secure_url) {
        alert("Upload failed");
        return;
      }

      router.push(`/(tabs)/create?imageUrl=${encodeURIComponent(json.secure_url)}`);

    } catch (err) {
      console.error("Cloudinary upload error:", err);
      alert("Upload error");

    } finally {
      setIsUploading(false);
    }
  };

  if (!permission?.granted) {
    return <Text>No permission for camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!preview && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={onCameraReady}
        />
      )}

      {preview && (
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
      )}

      {preview ? (
        <View style={styles.actionRow}>

          {/* RETAKE BUTTON (X) */}
          <TouchableOpacity
            onPress={isUploading ? null : retake}
            style={[styles.actionButton, isUploading && { opacity: 0.4 }]}
            disabled={isUploading}
          >
            <Ionicons name="close" size={32} color="#2d2d2d" />
          </TouchableOpacity>

          {/* CONFIRM BUTTON (✓ or LOADING) */}
          <TouchableOpacity
            onPress={confirmPhoto}
            style={[styles.actionButton, isUploading && { opacity: 0.4 }]}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="large" color="#2d2d2d" />
            ) : (
              <Ionicons name="checkmark" size={32} color="#2d2d2d" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.captureContainer}>
          <TouchableOpacity disabled={!isCameraReady} onPress={takePhoto}>
            <View style={styles.captureButton} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}