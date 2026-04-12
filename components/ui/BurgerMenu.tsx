import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from "react-native";
import * as Animatable from "react-native-animatable";

import i18n from "../../i18n";
import { clearConversationId } from "../../utils/chatWithGPT";
import { handleActiveSessionDecision } from "../../utils/handleActiveSessionDecision";
import { isPaid, isTrialActive } from "../../utils/access";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BurgerMenu({ visible, onClose }: Props) {
  const router = useRouter();

  const showWebConfirm = async ({
    title,
    message,
    buttons,
  }: {
    title: string;
    message: string;
    buttons?: Array<{
      key: string;
      label: string;
      destructive?: boolean;
    }>;
  }): Promise<string> => {
    if (Platform.OS !== "web") return "cancel";

    return await new Promise<string>((resolve) => {
      (window as any).__MAMASCOTA_CONFIRM_RESOLVE__ = resolve;

      window.dispatchEvent(
        new CustomEvent("mamascota:confirm", {
          detail: {
            title,
            message,
            buttons:
              buttons && buttons.length > 0
                ? buttons
                : [
                    {
                      key: "ok",
                      label: String(i18n.t("ok_button")),
                    },
                  ],
          },
        })
      );
    });
  };

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [animalProfile, setAnimalProfile] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const loadFlags = async () => {
      // читаем оба варианта ключа — старый и новый
      const legacyTerms = await AsyncStorage.getItem("termsAccepted");
      const acceptedTerms = await AsyncStorage.getItem("acceptedTerms");
      const profile = await AsyncStorage.getItem("animalProfile");
      const cid = await AsyncStorage.getItem("conversationId");

      // согласие с условиями: если хотя бы один флаг true
      const isAccepted =
        legacyTerms === "true" || acceptedTerms === "true";

      // наличие хотя бы одной сохранённой сессии

      setTermsAccepted(isAccepted);
      setAnimalProfile(!!profile);
      setConversationId(cid || null);

      const dev = await AsyncStorage.getItem("devMode");
      setDevMode(dev === "1");
    };

    if (visible) {
      loadFlags();
    }
    
  }, [visible]);

  // 🔥 Переход в чат — всегда проверяем, что есть conversationId
  const enterChat = async () => {
    const cid = await AsyncStorage.getItem("conversationId");

    if (!cid) {
      if (Platform.OS === "web") {
        await showWebConfirm({
          title: String(i18n.t("no_active_chat_title")),
          message: String(i18n.t("no_active_chat_message")),
        });
      } else {
        Alert.alert(
          String(i18n.t("no_active_chat_title")),
          String(i18n.t("no_active_chat_message"))
        );
      }
      return;
    }

    // сообщаем ChatScreen, что нужно восстановиться
    await AsyncStorage.setItem("restoreFromSummary", "1");

    onClose();
    setTimeout(() => router.replace("/chat"), 120);
  };

  const menuItems = [
    {
      label: String(i18n.t("menu.about")),
      icon: "info",
      enabled: true,
      action: () => {
        onClose();
        setTimeout(() => router.replace("/about"), 120);
      },
    },
    {
      label: String(i18n.t("menu.settings")),
      icon: "settings",
      // язык и базовые настройки — всегда доступны
      enabled: true,
      action: () => {
        onClose();
        setTimeout(() => router.replace("/settings"), 120);
      },
    },
    {
    label: String(i18n.t("menu.start_consultation")),
      icon: "pets",
      // выбор животного доступен только после согласия с условиями
      enabled: termsAccepted,
      action: async () => {
        const paid = await isPaid();
        const trialActive = await isTrialActive();

        if (!paid && !trialActive) {
          onClose();

          setTimeout(async () => {
            if (Platform.OS === "web") {
              const result = await showWebConfirm({
                title: String(i18n.t("alert_title", { defaultValue: "Attention" })),
                message: String(
                  i18n.t("paywall_trial_expired", {
                    defaultValue: "Trial expired. Please upgrade to continue.",
                  })
                ),
                buttons: [
                  {
                    key: "pay",
                    label: String(
                      i18n.t("paywall_go_to_payment", {
                        defaultValue: "Upgrade",
                      })
                    ),
                  },
                  {
                    key: "cancel",
                    label: String(i18n.t("cancel")),
                  },
                ],
              });

              if (result === "pay") {
                window.location.href = "https://mamascota.com";
              }
            } else {
              Alert.alert(
                String(i18n.t("alert_title", { defaultValue: "Attention" })),
                String(
                  i18n.t("paywall_trial_expired", {
                    defaultValue: "Trial expired. Please upgrade to continue.",
                  })
                ),
                [
                  {
                    text: String(
                      i18n.t("paywall_go_to_payment", {
                        defaultValue: "Upgrade",
                      })
                    ),
                    onPress: () => {
                      router.push("https://mamascota.com");
                    },
                  },
                  {
                    text: String(i18n.t("cancel")),
                    style: "cancel",
                  },
                ]
              );
            }
          }, 180);

          return;
        }

        onClose();

        setTimeout(async () => {
          const decision = await handleActiveSessionDecision();

          if (decision === "resume") {
            await AsyncStorage.setItem("restoreFromSummary", "1");
            router.replace("/chat");
            return;
          }

          if (decision === "start_new") {
            await clearConversationId();
            router.replace("/animal-selection");
            return;
          }

          if (decision === "no_active") {
            router.replace("/animal-selection");
            return;
          }

          // cancel — ничего не делаем
        }, 180);
      },
    },
    {
      label: String(i18n.t("menu.chat")),
      icon: "chat",
      enabled: !!conversationId,
      action: enterChat,
    },
    {
      label: String(i18n.t("menu.saved_sessions")),
      icon: "list",
      enabled: true,   // ← вместо hasSummary
      action: () => {
        onClose();
        setTimeout(() => router.replace("/summary"), 120);
      },
    },

  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View
          animation="fadeInUp"
          duration={300}
          style={styles.menuContainer}
        >
          {menuItems.map((item, index) => {
            const { label, icon, enabled, action } = item;

            if (enabled) {
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={action}
                >
                  <MaterialIcons
                    name={icon as any}
                    size={22}
                    color="#666"
                    style={styles.icon}
                  />
                  <Text style={styles.menuText}>{label}</Text>
                </TouchableOpacity>
              );
            }

            return (
              <View key={index} style={styles.menuItem}>
                <MaterialIcons
                  name={icon as any}
                  size={22}
                  color="#bbb"
                  style={styles.icon}
                />
                <Text style={styles.menuTextDisabled}>{label}</Text>
              </View>
            );
          })}

        {/* В начало */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            setTimeout(() => router.replace("/"), 120);
          }}
        >

            <MaterialIcons
              name="logout"
              size={22}
              color="#999"
              style={styles.icon}
            />
            <Text style={styles.menuText}>{i18n.t("exit_button")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={async () => {
              const next = devMode ? "0" : "1";
              await AsyncStorage.setItem("devMode", next);
              setDevMode(next === "1");
            }}
          >
            <Text style={{ color: devMode ? "#43A047" : "#999" }}>
              {devMode ? "🧪 Dev mode ON" : "🧪 Dev mode OFF"}
            </Text>
          </TouchableOpacity>

          {/* DEV — Trial controls */}
          {devMode && (
            <View style={{ width: "100%", marginTop: 12 }}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  await AsyncStorage.setItem(
                    "access.trialStart",
                    String(Date.now() - 15 * 24 * 60 * 60 * 1000)
                  );
                  console.log("🔥 Trial forced EXPIRED");
                }}
              >
                <Text style={{ color: "#E53935" }}>DEV: Expire trial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  await AsyncStorage.setItem(
                    "access.trialStart",
                    String(Date.now())
                  );
                  console.log("🟢 Trial reset ACTIVE");
                }}
              >
                <Text style={{ color: "#43A047" }}>DEV: Activate trial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  await AsyncStorage.setItem("access.pdfCount", "0");
                  console.log("📄 PDF count reset");
                }}
              >
                <Text style={{ color: "#1E88E5" }}>DEV: Reset PDF count</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  const keys = await AsyncStorage.getAllKeys();
                  const pdfKeys = keys.filter((k) => k.startsWith("pdfGenerated:"));
                  await AsyncStorage.multiRemove(pdfKeys);
                  console.log("🧹 PDF cache cleared");
                }}
              >
                <Text style={{ color: "#FB8C00" }}>DEV: Clear PDF cache</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Закрыть */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={{ fontSize: 22, color: "#ccc" }}>✕</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 80,
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "90%",
    maxWidth: 420,
    alignItems: "flex-start",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    width: "100%",
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
  },
  menuTextDisabled: {
    fontSize: 16,
    color: "#bbb",
    fontWeight: "400",
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 20,
  },
});
