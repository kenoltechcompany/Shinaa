import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Central API URL configuration (exported as a let for live ES Module bindings)
export let API_URL = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
}) as string;

export function setApiUrl(url: string) {
  API_URL = url;
}

export async function loadSavedServerUrl(): Promise<string | null> {
  try {
    const saved = await SecureStore.getItemAsync("server_url");
    if (saved) {
      API_URL = saved;
      return saved;
    }
  } catch (error) {
    console.error("Failed to load server_url from SecureStore:", error);
  }
  return null;
}

export async function saveServerUrl(url: string): Promise<void> {
  try {
    await SecureStore.setItemAsync("server_url", url);
    API_URL = url;
  } catch (error) {
    console.error("Failed to save server_url to SecureStore:", error);
  }
}
