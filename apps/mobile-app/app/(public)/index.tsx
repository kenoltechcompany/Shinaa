import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../src/config";

interface ActiveLog {
  id: string;
  studentName: string;
  studentId: string;
  phoneNumber: string;
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  keys?: Array<{
    id: string;
    keyLogs?: ActiveLog[];
  }>;
}

interface PeekSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  scheduleType: "recurring_class" | "one_time_event";
}

export default function MobilePublicWorkspace() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Peek Modal states
  const [peekRoom, setPeekRoom] = useState<Room | null>(null);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekSlots, setPeekSlots] = useState<PeekSlot[]>([]);
  const [peekError, setPeekError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms`);
      if (!response.ok) {
        throw new Error("Failed to sync room ledger");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error. Make sure your dynamic server is online.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleOpenPeek = async (room: Room) => {
    setPeekRoom(room);
    setPeekLoading(true);
    setPeekSlots([]);
    setPeekError(null);

    try {
      const response = await fetch(`${API_URL}/api/rooms/${room.id}/peek`);
      if (!response.ok) {
        throw new Error("Failed to load upcoming slots");
      }
      const data = await response.json();
      setPeekSlots(data);
    } catch (err: any) {
      setPeekError(err.message || "Error peeking schedules");
    } finally {
      setPeekLoading(false);
    }
  };

  // Filter & Sort:
  // 1. Filter by search name.
  // 2. Taken rooms (active logs > 0) float to top.
  // 3. Available rooms sorted alphabetically.
  const filteredAndSortedRooms = rooms
    .filter((room) => room.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const activeA = a.keys?.[0]?.keyLogs?.length || 0;
      const activeB = b.keys?.[0]?.keyLogs?.length || 0;
      const isTakenA = activeA > 0;
      const isTakenB = activeB > 0;

      if (isTakenA && !isTakenB) return -1;
      if (!isTakenA && isTakenB) return 1;

      return a.name.localeCompare(b.name);
    });

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Sticky Search & Staff login header */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Campus Ledger</Text>
            <Text style={styles.headerSubtitle}>Real-time availability status</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/login")} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Staff Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={16} color="#656D76" style={styles.searchIcon} />
          <TextInput
            placeholder="Search rooms by name..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#656D76"
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && !refreshing && (
          <ActivityIndicator size="small" color="#0969DA" style={styles.spinner} />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && filteredAndSortedRooms.length === 0 && (
          <Text style={styles.emptyText}>No campus rooms found.</Text>
        )}

        {/* Room cards */}
        {filteredAndSortedRooms.map((room) => {
          const activeLogs = room.keys?.[0]?.keyLogs || [];
          const isAvailable = activeLogs.length === 0;

          return (
            <View
              key={room.id}
              style={[
                styles.roomCard,
                isAvailable ? styles.cardAvailable : styles.cardTaken,
              ]}
            >
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomType}>{room.roomType.replace("_", " ")}</Text>
              </View>

              <View style={styles.statusSection}>
                {isAvailable ? (
                  <View style={[styles.badge, styles.badgeAvailable]}>
                    <Text style={[styles.badgeText, styles.badgeTextAvailable]}>Available</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeTaken]}>
                    <Text style={[styles.badgeText, styles.badgeTextTaken]}>
                      {activeLogs.length === 1 ? "Taken" : `Taken (${activeLogs.length})`}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenPeek(room)}
                style={styles.peekButton}
              >
                <Ionicons name="eye-outline" size={18} color="#24292F" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Peek bottom sheet modal */}
      <Modal
        visible={peekRoom !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPeekRoom(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setPeekRoom(null)}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Upcoming: Room {peekRoom?.name}</Text>
                <Text style={styles.sheetSubtitle}>Today's next scheduled activities</Text>
              </View>
              <TouchableOpacity onPress={() => setPeekRoom(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#656D76" />
              </TouchableOpacity>
            </View>

            {peekLoading && (
              <ActivityIndicator size="small" color="#0969DA" style={styles.sheetSpinner} />
            )}

            {peekError && (
              <Text style={styles.sheetError}>{peekError}</Text>
            )}

            {!peekLoading && !peekError && peekSlots.length === 0 && (
              <Text style={styles.sheetEmpty}>No upcoming slots or classes today.</Text>
            )}

            {!peekLoading && !peekError && peekSlots.length > 0 && (
              <View style={styles.slotsContainer}>
                {peekSlots.map((slot) => (
                  <View
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      slot.scheduleType === "recurring_class"
                        ? styles.slotRecurring
                        : styles.slotEvent,
                    ]}
                  >
                    <Text style={styles.slotTitle}>{slot.title}</Text>
                    <Text style={styles.slotTime}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setPeekRoom(null)}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  stickyHeader: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D7DE",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2328",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#656D76",
    marginTop: 1,
  },
  loginBtn: {
    backgroundColor: "#0969DA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2328",
  },
  container: {
    padding: 16,
  },
  spinner: {
    marginVertical: 20,
  },
  errorText: {
    color: "#CF222E",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#656D76",
    fontSize: 13,
    marginTop: 20,
    fontStyle: "italic",
  },
  roomCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardAvailable: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D0D7DE",
  },
  cardTaken: {
    backgroundColor: "#F0F6FC",
    borderColor: "#388BFD",
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2328",
  },
  roomType: {
    fontSize: 11,
    color: "#656D76",
    textTransform: "capitalize",
    marginTop: 2,
    fontWeight: "500",
  },
  statusSection: {
    marginHorizontal: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeAvailable: {
    backgroundColor: "#DDF4E4",
    borderColor: "#1F883D20",
  },
  badgeTaken: {
    backgroundColor: "#FFEBE9",
    borderColor: "#CF222E20",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  badgeTextAvailable: {
    color: "#1F883D",
  },
  badgeTextTaken: {
    color: "#CF222E",
  },
  peekButton: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#D0D7DE",
    minHeight: 280,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D7DE",
    paddingBottom: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2328",
  },
  sheetSubtitle: {
    fontSize: 11,
    color: "#656D76",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  sheetSpinner: {
    marginVertical: 20,
  },
  sheetError: {
    color: "#CF222E",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 10,
  },
  sheetEmpty: {
    color: "#656D76",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 20,
    fontStyle: "italic",
  },
  slotsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  slotCard: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  slotRecurring: {
    backgroundColor: "#F0F6FC",
    borderColor: "#388BFD",
  },
  slotEvent: {
    backgroundColor: "#F2F9F5",
    borderColor: "#30A46C",
  },
  slotTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2328",
  },
  slotTime: {
    fontSize: 10,
    color: "#656D76",
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  dismissBtn: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  dismissBtnText: {
    color: "#24292F",
    fontSize: 13,
    fontWeight: "600",
  },
});
