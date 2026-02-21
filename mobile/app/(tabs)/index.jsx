import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { Image } from "expo-image";
import { useAuthStore } from "../../store/authStore";
import { useEffect, useState } from "react";

import styles from "../../assets/styles/home.styles";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { formatPublishDate } from "../../lib/utils";
import Loader from "../../components/Loader";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const { token } = useAuthStore();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ---------- Fetch Tasks ----------
  const fetchTasks = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await fetch(
        `${API_URL}/tasks?page=${pageNum}&limit=2`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to fetch tasks");

      const uniqueTasks =
        refresh || pageNum === 1
          ? data.tasks
          : Array.from(
              new Set([...tasks, ...data.tasks].map((t) => t._id))
            ).map((id) =>
              [...tasks, ...data.tasks].find((t) => t._id === id)
            );

      setTasks(uniqueTasks);
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.log("Error fetching tasks:", error);
    } finally {
      if (refresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleLoadMore = async () => {
    if (hasMore && !loading && !refreshing) {
      await fetchTasks(page + 1);
    }
  };

  // ---------- Render Each Task ----------
  const renderTask = ({ item }) => (
    <View style={styles.bookCard}>
      {/* User */}
      <View style={styles.bookHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: item.user.profileImage }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{item.user.username}</Text>
        </View>
      </View>

      {/* Image */}
      <View style={styles.bookImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.bookImage}
          contentFit="cover"
        />
      </View>

      {/* Task Data */}
      <View style={styles.bookDetails}>
        <Text style={styles.bookTitle}>{item.title}</Text>

        <Text style={styles.caption}>{item.caption}</Text>

        <Text style={styles.date}>
          Posted on {formatPublishDate(item.createdAt)}
        </Text>

        <Text style={styles.caption}>
          📍 Location: {item.location.lat.toFixed(3)}, {item.location.lng.toFixed(3)}
        </Text>
      </View>
    </View>
  );

  // ---------- Loading ----------
  if (loading) return <Loader size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tasks</Text>
            <Text style={styles.headerSubtitle}>Latest posted tasks</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && tasks.length > 0 ? (
            <ActivityIndicator
              style={styles.footerLoader}
              size={"small"}
              color={"#4CAF50"}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={60} color={"#688f68"} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Be the first to add a task!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTasks(1, true)}
            colors={["#4CAF50"]}
            tintColor={"#4CAF50"}
          />
        }
      />
    </View>
  );
}
