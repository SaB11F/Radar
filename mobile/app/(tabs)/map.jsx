import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import COLORS from "../../constants/colors";
import { useDataStore } from "../../store/dataStore";

const DEFAULT_REGION = {
  latitude: 46.0569,
  longitude: 14.5058,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

function toCoordinateValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function hasValidCoordinates(radar) {
  const latitude = toCoordinateValue(radar?.latitude);
  const longitude = toCoordinateValue(radar?.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function MapScreen() {
  const radars = useDataStore((s) => s.radars);

  const radarLocations = useMemo(
    () =>
      radars
        .filter(hasValidCoordinates)
        .map((radar) => ({
          ...radar,
          latitude: toCoordinateValue(radar.latitude),
          longitude: toCoordinateValue(radar.longitude),
        })),
    [radars]
  );

  const initialRegion = useMemo(() => {
    if (radarLocations.length === 0) return DEFAULT_REGION;

    return {
      latitude: radarLocations[0].latitude,
      longitude: radarLocations[0].longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [radarLocations]);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {radarLocations.map((radar) => (
          <Marker
            key={radar.radarId}
            coordinate={{ latitude: radar.latitude, longitude: radar.longitude }}
            pinColor={COLORS.danger}
          >
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{radar.name || radar.radarId}</Text>
                <Text style={styles.calloutText}>Limit: {radar.speedLimit ?? 50} km/h</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {radarLocations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No radar locations available</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  callout: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 140,
  },
  calloutTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  calloutText: {
    color: COLORS.textSecondary,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
