import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  // Capture button at bottom (when taking photo)
  captureContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },

  captureButton: {
    height: 70,
    width: 70,
    borderRadius: 35,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#5A45FF",
  },

  // Row with confirm + retake
  actionRow: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },

  // Round button styling
  actionButton: {
    height: 70,
    width: 70,
    borderRadius: 35,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
