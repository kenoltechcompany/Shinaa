import { useState, useEffect, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getToken, deleteToken } from "../../src/storage";
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

export default function MobileCaretakerWorkspace() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Peek Popover States (separate modal)
  const [peekRoom, setPeekRoom] = useState<Room | null>(null);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekSlots, setPeekSlots] = useState<PeekSlot[]>([]);
  const [peekError, setPeekError] = useState<string | null>(null);

  const nameInputRef = useRef<TextInput>(null);

  const loadTokenAndData = async () => {
    const savedToken = await getToken("shinaa_token");
    if (!savedToken) {
      router.replace("/login");
      return;
    }
    setToken(savedToken);
    fetchRooms(savedToken);
  };

  const fetchRooms = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms`);
      if (!response.ok) {
        throw new Error("Failed to sync room statuses");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error. Verify backend server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshRoomsAndSelect = async (currentSelectedId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/rooms`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        const updatedSelected = data.find((r: Room) => r.id === currentSelectedId);
        if (updatedSelected) {
          setSelectedRoom(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Error refreshing room list:", err);
    }
  };

  useEffect(() => {
    loadTokenAndData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    if (token) fetchRooms(token);
  };

  const handleLogout = async () => {
    await deleteToken("shinaa_token");
    router.replace("/login");
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

  const openCheckoutModal = (room: Room) => {
    setSelectedRoom(room);
    setStudentName("");
    setStudentId("");
    setPhoneNumber("");
    setCheckoutError(null);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  };

  const closeCheckoutModal = () => {
    setSelectedRoom(null);
    setCheckoutError(null);
  };

  const handleCheckoutSubmit = async () => {
    const keyId = selectedRoom?.keys?.[0]?.id;
    if (!keyId || !token) {
      setCheckoutError("No physical key registered for this room.");
      return;
    }

    if (!studentName || !studentId || !phoneNumber) {
      setCheckoutError("Please fill in all checkout fields");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch(`${API_URL}/api/keys/${keyId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentId: studentId.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const firstErrField = Object.keys(data.errors)[0];
          throw new Error(`${firstErrField}: ${data.errors[firstErrField][0]}`);
        }
        throw new Error(data.error || "Failed to check out key");
      }

      setStudentName("");
      setStudentId("");
      setPhoneNumber("");
      await refreshRoomsAndSelect(selectedRoom.id);
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturnKeyLog = async (logId: string) => {
    const keyId = selectedRoom?.keys?.[0]?.id;
    if (!keyId || !token) return;

    try {
      const response = await fetch(`${API_URL}/api/keys/${keyId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          logId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to log key return");
      }

      await refreshRoomsAndSelect(selectedRoom.id);
    } catch (err: any) {
      Alert.alert("Return Error", err.message || "Error returning key");
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

  const activeLogs = selectedRoom?.keys?.[0]?.keyLogs || [];

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Sticky Header with Search */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Staff Ledger</Text>
            <Text style={styles.headerSubtitle}>Tap card to check out or return</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
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
          const activeLogsCount = room.keys?.[0]?.keyLogs?.length || 0;
          const isAvailable = activeLogsCount === 0;

          return (
            <TouchableOpacity
              key={room.id}
              onPress={() => openCheckoutModal(room)}
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
                      {activeLogsCount === 1 ? "Taken" : `Taken (${activeLogsCount})`}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Multi-Checkout Modal */}
      <Modal
        visible={selectedRoom !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCheckoutModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Key Ledger: Room {selectedRoom?.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedRoom?.roomType.replace("_", " ")}
                </Text>
              </View>
              <TouchableOpacity onPress={closeCheckoutModal} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#656D76" />
              </TouchableOpacity>
            </View>

            {/* Active Ledger Pills */}
            <View style={styles.ledgerWrapper}>
              <Text style={styles.ledgerTitle}>
                Active Checkouts ({activeLogs.length})
              </Text>
              {activeLogs.length === 0 ? (
                <Text style={styles.ledgerEmpty}>
                  Key is currently in locker (Available).
                </Text>
              ) : (
                <ScrollView style={styles.pillsScroll} nestedScrollEnabled={true}>
                  <View style={styles.pillsContainer}>
                    {activeLogs.map((log) => (
                      <View key={log.id} style={styles.pillCard}>
                        <View style={styles.pillInfo}>
                          <Text style={styles.pillName}>{log.studentName}</Text>
                          <Text style={styles.pillSub}>
                            ID: {log.studentId} • Tel: {log.phoneNumber}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleReturnKeyLog(log.id)}
                          style={styles.pillDeleteBtn}
                        >
                          <Ionicons name="close-circle" size={18} color="#CF222E" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Checkout Form */}
            <View style={styles.formContainer}>
              <Text style={styles.ledgerTitle}>New Checkout</Text>

              {checkoutError && (
                <Text style={styles.checkoutErrorText}>{checkoutError}</Text>
              )}

              <TextInput
                ref={nameInputRef}
                style={styles.formInput}
                placeholder="Student Name (e.g. John Doe)"
                placeholderTextColor="#656D76"
                value={studentName}
                onChangeText={setStudentName}
                editable={!checkoutLoading}
              />

              <View style={styles.formRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Student ID"
                  placeholderTextColor="#656D76"
                  value={studentId}
                  onChangeText={setStudentId}
                  editable={!checkoutLoading}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Phone Number"
                  placeholderTextColor="#656D76"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!checkoutLoading}
                />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={closeCheckoutModal}
                  style={[styles.button, styles.btnCancel]}
                  disabled={checkoutLoading}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCheckoutSubmit}
                  style={[styles.button, styles.btnSubmit]}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnSubmitText}>Mark Taken</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Peek Modal */}
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
  logoutBtn: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#24292F",
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
    minHeight: 460,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D7DE",
    paddingBottom: 12,
    marginBottom: 12,
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
    textTransform: "capitalize",
  },
  closeBtn: {
    padding: 4,
  },
  ledgerWrapper: {
    marginBottom: 16,
  },
  ledgerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2328",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ledgerEmpty: {
    fontSize: 11,
    color: "#656D76",
    fontStyle: "italic",
    padding: 10,
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    textAlign: "center",
  },
  pillsScroll: {
    maxHeight: 120,
  },
  pillsContainer: {
    gap: 6,
  },
  pillCard: {
    flexDirection: "row",
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillInfo: {
    flex: 1,
  },
  pillName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2328",
  },
  pillSub: {
    fontSize: 10,
    color: "#656D76",
    marginTop: 2,
  },
  pillDeleteBtn: {
    padding: 4,
  },
  formContainer: {
    borderTopWidth: 1,
    borderTopColor: "#D0D7DE",
    paddingTop: 12,
  },
  checkoutErrorText: {
    color: "#CF222E",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2328",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#F6F8FA",
    borderWidth: 1,
    borderColor: "#D0D7DE",
  },
  btnCancelText: {
    color: "#24292F",
    fontSize: 13,
    fontWeight: "600",
  },
  btnSubmit: {
    backgroundColor: "#1F883D",
    flex: 1,
  },
  btnSubmitText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
