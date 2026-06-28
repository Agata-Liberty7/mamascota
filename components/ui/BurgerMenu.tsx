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
import { clearActiveConversationData, clearConversationId } from "../../utils/chatWithGPT";
import { handleActiveSessionDecision } from "../../utils/handleActiveSessionDecision";
import { isPaid } from "../../utils/access";

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
  const [hasSavedSessions, setHasSavedSessions] = useState(false);

  useEffect(() => {
    const loadFlags = async () => {
      // читаем оба варианта ключа — старый и новый
      const legacyTerms = await AsyncStorage.getItem("termsAccepted");
      const acceptedTerms = await AsyncStorage.getItem("acceptedTerms");
      const profile = await AsyncStorage.getItem("animalProfile");
      const cid = await AsyncStorage.getItem("conversationId");
      const paid = await isPaid();

      // согласие с условиями: если хотя бы один флаг true
      const isAccepted =
        legacyTerms === "true" || acceptedTerms === "true";

      // наличие хотя бы одной сохранённой сессии

      setTermsAccepted(isAccepted);
      setAnimalProfile(!!profile);
      setConversationId(cid || null);
      setHasSavedSessions(paid);
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
    label: String(i18n.t("menu.start_consultation")),
      icon: "pets",
      // выбор животного доступен только после согласия с условиями
      enabled: termsAccepted,
      action: async () => {

        onClose();

        setTimeout(async () => {
          const activeId = await AsyncStorage.getItem("conversationId");

          if (activeId) {
            await AsyncStorage.setItem("restoreFromSummary", "1");
            await AsyncStorage.setItem("decisionTreeStale", "1");

            router.replace("/chat");
            return;
          }

          router.replace("/animal-selection");
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
      divider: true,
    },
    {
      label: String(i18n.t("plus.title")),
      icon: "add-circle",
      enabled: true,
      plus: true,
      action: () => {
        onClose();
        setTimeout(() => router.push("/plus"), 120);
      },
    },

    {
      label: String(i18n.t("menu.saved_sessions")),
      icon: "list",
      enabled: hasSavedSessions,
      action: () => {
        onClose();
        setTimeout(() => {
          router.replace("/summary");
        }, 120);
      },
    },

    {
      label: `${String(
        i18n.t("menu.observation_journal", {
          defaultValue: "Observation journal",
        })
      )} · ${String(
        i18n.t("coming_soon", {
          defaultValue: "Coming soon",
        })
      )}`,
      icon: "book",
      enabled: false,
    },
    {
      label: `${String(
        i18n.t("menu.vet_clinics", {
          defaultValue: "Veterinary clinics",
        })
      )} · ${String(
        i18n.t("coming_soon", {
          defaultValue: "Coming soon",
        })
      )}`,
      icon: "local-hospital",
      enabled: false,
    },
    {
      label: `${String(
        i18n.t("menu.health_history", {
          defaultValue: "Health history",
        })
      )} · ${String(
        i18n.t("coming_soon", {
          defaultValue: "Coming soon",
        })
      )}`,
      icon: "timeline",
      enabled: false,
    },
    {
      divider: true,
    },
    {
      label: String(
        i18n.t("menu.support_mamascota", {
          defaultValue: "Support Mamascota",
        })
      ),
      icon: "favorite",
      enabled: true,
      accent: true,
      action: () => {
        onClose();
        setTimeout(() => router.push("/paywall"), 120);
      },
    },
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
          {menuItems.map((item: any, index) => {

            if (item.divider) {
              return <View key={`divider-${index}`} style={styles.divider} />;
            }

            const { label, icon, enabled, action, accent, plus } = item;

            if (enabled) {
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    accent && styles.menuItemAccent,
                  ]}
                  onPress={action}
                >
                  <MaterialIcons
                    name={icon as any}
                    size={22}
                    color={
                      plus
                        ? "#14B8A6"
                        : accent
                        ? "#43A7F7"
                        : "#666"
                    }
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.menuText,
                      accent && styles.menuTextAccent,
                      plus && { color: "#14B8A6", fontWeight: "700" },
                    ]}
                  >
                    {label}
                  </Text>
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
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  menuItemAccent: {
    borderRadius: 10,
  },
  menuTextAccent: {
    color: "#43A7F7",
    fontWeight: "700",
  },
});
