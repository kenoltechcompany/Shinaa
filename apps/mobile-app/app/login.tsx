import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { saveToken } from "../src/storage";
import { API_URL } from "../src/config";

export default function CaretakerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please fill in all credentials");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid sign in credentials");
      }

      // Store JWT token securely
      await saveToken("shinaa_token", data.token);

      // Verify that user role matches caretaker or official
      if (data.user.role !== "caretaker" && data.user.role !== "official") {
        throw new Error("Access denied: You are not authorized on this client");
      }

      // Redirect to caretaker dashboard
      router.replace("/caretaker");
    } catch (err: any) {
      setError(err.message || "Network connection failure. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Caretaker Sign In</Text>
          <Text style={styles.subtitle}>Enter your staff credentials to open the checkout ledger</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. caretaker@shinaa.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#656D76"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#656D76"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitButton, loading ? styles.disabledBtn : null]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    padding: 24,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2328",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#656D76",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  errorText: {
    color: "#CF222E",
    backgroundColor: "#FFEBE9",
    borderWidth: 1,
    borderColor: "#FFC1C0",
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2328",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2328",
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#0969DA",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  backButtonText: {
    color: "#656D76",
    fontSize: 13,
    fontWeight: "500",
  },
});
