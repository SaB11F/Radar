import { useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import styles from "../../assets/styles/profile.styles";
import ProfileHeader from "../../components/ProfileHeader";
import LogoutButton from "../../components/LogoutButton";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { Image } from "expo-image";
import { sleep } from ".";
import Loader from "../../components/Loader";

export default function Profile() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const { token } = useAuthStore();
  const router = useRouter();

  // ---------------- FETCH USER TASKS ----------------
  const fetchData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/tasks/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Failed to fetch your tasks");

      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", "Failed to load task data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------- DELETE TASK ----------------
  const handleDeleteTask = async (taskId) => {
    try {
      setDeleteTaskId(taskId);

      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Failed to delete task");

      setTasks((prev) => prev.filter((t) => t._id !== taskId));

      Alert.alert("Success", "Task deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", error.message || "Failed to delete task");
    } finally {
      setDeleteTaskId(null);
    }
  };

  const confirmDelete = (taskId) => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this task?")) handleDeleteTask(taskId);
    } else {
      Alert.alert("Delete Task", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteTask(taskId) },
      ]);
    }
  };

  // ---------------- RENDER TASK ITEM ----------------
  const renderTaskItem = ({ item }) => (
    <View style={styles.bookItem}>
      <Image
        source={{ uri: item.image }}
        style={styles.bookImage}
        contentFit="cover"
      />

      <View>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookCaption} numberOfLines={2}>
          {item.caption}
        </Text>
        <Text style={styles.bookDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(item._id)}
      >
        {deleteTaskId === item._id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="trash-outline" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );

  // ---------------- REFRESH ----------------
  const handleRefresh = async () => {
    setRefreshing(true);
    await sleep(300);
    await fetchData();
    setRefreshing(false);
  };

  if (isLoading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <ProfileHeader />
      <LogoutButton />

      <View style={styles.booksHeader}>
        <Text style={styles.booksTitle}>Your Tasks</Text>
        <Text style={styles.booksCount}>{tasks.length} tasks</Text>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.booksList}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#000"]}
            tintColor={"#000"}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="construct-outline"
              size={50}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>No tasks yet</Text>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/create")}
            >
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
