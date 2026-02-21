import React, { useState, useEffect } from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { View, StyleSheet } from "react-native";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";

const INITIAL_REGION = {
  latitude: 46.4203,
  longitude: 15.8700,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function Map() {
  const [hasPermission, setHasPermission] = useState(false);
  const [tasks, setTasks] = useState([]);

  const { token } = useAuthStore();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setHasPermission(true);
    })();
  }, []);

  // Fetch all tasks
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/tasks/map`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks))
      .catch((err) => console.log("Error fetching tasks:", err));
  }, [token]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation={hasPermission}
        showsMyLocationButton={hasPermission}
      >

        {/* DISPLAY ALL TASK MARKERS */}
        {tasks.map(task => (
          <Marker
            key={task.id}
            coordinate={{ latitude: task.lat, longitude: task.lng }}
            title={task.title}
            description={task.caption}
          />
        ))}


      </MapView>
    </View>
  );
}
