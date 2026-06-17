import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from "react-native";
import { loadSavedServerUrl, saveServerUrl } from "../src/config";

interface Campus {
  id: string;
  name: string;
  aliases: string[];
  server_url: string;
}

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [hasUrl, setHasUrl] = useState(false);

  // Discovery states
  const [searchQuery, setSearchQuery] = useState("");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const checkServerUrl = async () => {
    try {
      const saved = await loadSavedServerUrl();
      if (saved) {
        setHasUrl(true);
      } else {
        fetchCampuses();
      }
    } catch (e) {
      fetchCampuses();
    } finally {
      setLoading(false);
    }
  };

  const fetchCampuses = async () => {
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    try {
      // Point to Vite server running on port 5173
      const devServerHost = Platform.select({
        android: "10.0.2.2:5173",
        default: "localhost:5173",
      });
      const response = await fetch(`http://${devServerHost}/directory.json`);
      if (!response.ok) {
        throw new Error("Unable to retrieve campus directory");
      }
      const data = await response.json();
      setCampuses(data);
    } catch (err: any) {
      console.error(err);
      setDiscoveryError("Could not fetch the campus directory. Make sure your local Vite server is running.");
    } finally {
      setDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    checkServerUrl();
  }, []);

  const handleSelectCampus = async (campus: Campus) => {
    let url = campus.server_url;
    // Map Android local loopback IP to iOS local loopback if needed
    if (Platform.OS !== "android" && url.includes("10.0.2.2")) {
      url = url.replace("10.0.2.2", "localhost");
    }
    await saveServerUrl(url);
    setHasUrl(true);
  };

  // Filter campuses based on name or aliases
  const filteredCampuses = campuses.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesName = c.name.toLowerCase().includes(query);
    const matchesAlias = c.aliases.some((alias) => alias.toLowerCase().includes(query));
    return matchesName || matchesAlias;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0969DA" />
        <Text style={styles.loadingText}>Initializing Shinaa Ledger...</Text>
      </View>
    );
  }

  // Render Discovery Screen if server_url is not saved
  if (!hasUrl) {
    return (
      <SafeAreaView style={styles.discoveryContainer}>
        <View style={styles.discoveryHeader}>
          <Text style={styles.logo}>Shinaa</Text>
          <Text style={styles.discoveryTitle}>Campus Discovery</Text>
          <Text style={styles.discoverySubtitle}>
            Select your university to connect to the locker system.
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for your university (e.g. GCTU, Localhost)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#656D76"
          />
        </View>

        {discoveryLoading && (
          <View style={styles.centeredView}>
            <ActivityIndicator size="small" color="#0969DA" />
            <Text style={styles.infoText}>Loading campus list...</Text>
          </View>
        )}

        {discoveryError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{discoveryError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCampuses}>
              <Text style={styles.retryButtonText}>Retry Fetch</Text>
            </TouchableOpacity>
          </View>
        )}

        {!discoveryLoading && !discoveryError && (
          <FlatList
            data={filteredCampuses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No campuses found matching your search.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.campusCard}
                onPress={() => handleSelectCampus(item)}
              >
                <View>
                  <Text style={styles.campusName}>{item.name}</Text>
                  <Text style={styles.campusAliases}>
                    Aliases: {item.aliases.join(", ")}
                  </Text>
                  <Text style={styles.campusUrl}>{item.server_url}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // Render normal stack navigation
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#1F2328",
        headerShadowVisible: true,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 16,
        },
        contentStyle: {
          backgroundColor: "#F6F8FA",
        },
      }}
    >
      <Stack.Screen name="(public)/index" options={{ title: "Shinaa - Live Ledger" }} />
      <Stack.Screen name="login" options={{ title: "Caretaker Sign In" }} />
      <Stack.Screen name="(caretaker)/caretaker" options={{ title: "Caretaker Ledger", headerLeft: () => null }} />
      <Stack.Screen name="(caretaker)/index" options={{ title: "Caretaker Ledger", headerLeft: () => null }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F8FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#656D76",
    fontWeight: "500",
  },
  discoveryContainer: {
    flex: 1,
    backgroundColor: "#F6F8FA",
    padding: 16,
  },
  discoveryHeader: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0969DA",
    letterSpacing: -1,
  },
  discoveryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2328",
    marginTop: 10,
  },
  discoverySubtitle: {
    fontSize: 12,
    color: "#656D76",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  searchContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2328",
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  campusCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    padding: 16,
    marginBottom: 10,
  },
  campusName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2328",
  },
  campusAliases: {
    fontSize: 11,
    color: "#656D76",
    marginTop: 4,
  },
  campusUrl: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    color: "#0969DA",
    marginTop: 6,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  infoText: {
    marginTop: 8,
    fontSize: 12,
    color: "#656D76",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 13,
    color: "#CF222E",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#0969DA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#656D76",
    fontSize: 13,
    marginTop: 20,
    fontStyle: "italic",
  },
});
