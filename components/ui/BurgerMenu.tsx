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
} from "react-native";
import * as Animatable from "react-native-animatable";

import i18n from "../../i18n";
import { handleExitAction } from "../../utils/chatWithGPT";

const screenWidth = Dimensions.get("window").width;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BurgerMenu({ visible, onClose }: Props) {
  const router = useRouter();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [animalProfile, setAnimalProfile] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasSummary, setHasSummary] = useState(false);

  useEffect(() => {
    const loadFlags = async () => {
      // читаем оба варианта ключа — старый и новый
      const legacyTerms = await AsyncStorage.getItem("termsAccepted");
      const acceptedTerms = await AsyncStorage.getItem("acceptedTerms");
      const profile = await AsyncStorage.getItem("animalProfile");
      const cid = await AsyncStorage.getItem("conversationId");
      const summaryFlag = await AsyncStorage.getItem("lastChatSessionExists");

      // согласие с условиями: если хотя бы один флаг true
      const isAccepted =
        legacyTerms === "true" || acceptedTerms === "true";

      // наличие хотя бы одной сохранённой сессии
      const hasAnySummary =
        !!summaryFlag && summaryFlag !== "0" && summaryFlag !== "false";

      setTermsAccepted(isAccepted);
      setAnimalProfile(!!profile);
      setConversationId(cid || null);
      setHasSummary(hasAnySummary);
    };

    if (visible) {
      loadFlags();
    }
  }, [visible]);

  // 🔥 Переход в чат — всегда проверяем, что есть conversationId
  const enterChat = async () => {
    const cid = await AsyncStorage.getItem("conversationId");

    if (!cid) {
      Alert.alert(
        String(i18n.t("no_active_chat_title")),
        String(i18n.t("no_active_chat_message"))
      );
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
      label: String(i18n.t("menu.animal_selection")),
      icon: "pets",
      // выбор животного доступен только после согласия с условиями
      enabled: termsAccepted,
      action: () => {
        onClose();
        setTimeout(() => router.replace("/animal-selection"), 120);
      },
    },
    {
      label: String(i18n.t("menu.chat")),
      icon: "chat",
      enabled: !!conversationId,
      action: enterChat,
    },
    {
      label: String(i18n.t("menu.summary")),
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
          onPress={async () => {
            onClose();
            setTimeout(async () => {
              const petRaw = await AsyncStorage.getItem("pet");
              const pet = petRaw ? JSON.parse(petRaw) : null;
              const petName = pet?.name || "Без имени";

              await handleExitAction(petName);
              // навигацию внутри уже решает сам handleExitAction
            }, 150);
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
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: screenWidth * 0.8,
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
