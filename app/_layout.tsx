// app/_layout.tsx

import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppModal from "../components/ui/AppModal";
import LocalizedExitButton from "../components/ui/LocalizedExitButton";
import MenuButton from "../components/ui/MenuButton";
import i18n from "../i18n";
import { theme } from "../src/theme";
import { UiSettingsProvider } from "../src/context/UiSettings";
import "../src/setup/textScalePatch";

import { detectAndSetInitialLanguage } from "../utils/detectLanguage";

export default function AppLayout() {
  const [appReady, setAppReady] = useState(false);

  const [exitVisible, setExitVisible] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      await detectAndSetInitialLanguage();
      setAppReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handler = () => setExitVisible(true);

    window.addEventListener("mamascota:exit", handler);
    return () => window.removeEventListener("mamascota:exit", handler);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handler = (e: any) => {
      setConfirmConfig(e.detail);
      setConfirmVisible(true);
    };

    window.addEventListener("mamascota:confirm", handler);
    return () => window.removeEventListener("mamascota:confirm", handler);
  }, []);

  const resolveExit = (value: "save" | "delete" | "cancel") => {
    setExitVisible(false);

    if (Platform.OS !== "web") return;

    const resolver = (window as any).__MAMASCOTA_EXIT_RESOLVE__;
    if (resolver) {
      resolver(value);
      (window as any).__MAMASCOTA_EXIT_RESOLVE__ = null;
    }
  };

  const resolveConfirm = (value: string) => {
    setConfirmVisible(false);

    if (Platform.OS !== "web") return;

    const resolver = (window as any).__MAMASCOTA_CONFIRM_RESOLVE__;
    if (resolver) {
      resolver(value);
      (window as any).__MAMASCOTA_CONFIRM_RESOLVE__ = null;
    }
  };

  if (!appReady) return null;

  return (
    <UiSettingsProvider>
      <SafeAreaProvider>
        <>
          <Stack
            screenOptions={{
              title: "",
              headerBackTitle: "",
              headerBackVisible: true,
              headerBackButtonDisplayMode: "minimal",
              headerRight: () => <MenuButton />,
              animation: "fade",
              animationDuration: 200,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="animal-selection" />

            <Stack.Screen
              name="chat"
              options={{
                headerRight: () => <LocalizedExitButton />,
                headerBackVisible: false,
                headerLeft: () => null,
              }}
            />

            <Stack.Screen name="summary" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="terms-screen" options={{ headerShown: false }} />
          </Stack>

          {Platform.OS === "web" && (
            <AppModal
              visible={exitVisible}
              title={i18n.t("exit_title")}
              onClose={() => resolveExit("cancel")}
              animationType="fade"
            >
              <View style={styles.actions}>
                <Text style={styles.message}>{i18n.t("exit_message")}</Text>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => resolveExit("save")}
                >
                  <Text style={styles.primaryBtnText}>
                    {i18n.t("exit_save")}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.dangerBtn}
                  onPress={() => resolveExit("delete")}
                >
                  <Text style={styles.dangerBtnText}>
                    {i18n.t("exit_delete")}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => resolveExit("cancel")}
                >
                  <Text style={styles.secondaryBtnText}>
                    {i18n.t("cancel")}
                  </Text>
                </Pressable>
              </View>
            </AppModal>
          )}

          {Platform.OS === "web" && confirmConfig && (
            <AppModal
              visible={confirmVisible}
              title={confirmConfig.title}
              onClose={() => resolveConfirm("cancel")}
              animationType="fade"
            >
              <View style={styles.actions}>
                <Text style={styles.message}>{confirmConfig.message}</Text>

                {confirmConfig.buttons?.map((btn: any) => (
                  <Pressable
                    key={btn.key}
                    style={
                      btn.key === "cancel"
                        ? styles.secondaryBtn
                        : btn.destructive
                        ? styles.dangerBtn
                        : styles.primaryBtn
                    }
                    onPress={() => resolveConfirm(btn.key)}
                  >
                    <Text
                      style={
                        btn.key === "cancel"
                          ? styles.secondaryBtnText
                          : btn.destructive
                          ? styles.dangerBtnText
                          : styles.primaryBtnText
                      }
                    >
                      {btn.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </AppModal>
          )}
        </>
      </SafeAreaProvider>
    </UiSettingsProvider>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.buttonPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 15,
    fontWeight: "600",
  },
  dangerBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C62828",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dangerBtnText: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
});