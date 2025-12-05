import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import SymptomSelector from "../components/SymptomSelector";
import i18n from "../i18n";
import type { Pet } from "../types/pet";
import { chatWithGPT } from "../utils/chatWithGPT";
import { getActivePetId, getPets } from "../utils/pets";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ChatScreen() {
  const { pet: petParam } = useLocalSearchParams<{ pet?: string }>();

  const [pet, setPet] = useState<Pet | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 ВАЖНО: по умолчанию не показываем селектор
  const [showSelector, setShowSelector] = useState<boolean>(false);

  const [inputHeight, setInputHeight] = useState(56);
  const flatListRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // ======================================================
  // 🟦 ШАГ 1 — Проверяем, есть ли сохранённая сессия
  // ======================================================
  useEffect(() => {
  (async () => {
    const id = await AsyncStorage.getItem("conversationId");
    if (id) {
      console.log("🔄 Есть активная сессия — пропускаем SymptomSelector");
      const saved = await AsyncStorage.getItem(`chatHistory:${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChat(parsed);
          setShowSelector(false);
        }
      }
    }
  })();
}, []);
  
  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("conversationId");
      if (!id) {
        // если нет сессии — показываем селектор
        setShowSelector(true);
        return;
      }

      const saved = await AsyncStorage.getItem(`chatHistory:${id}`);
      if (saved) {
        // если есть сохранённая история и id — ВОССТАНАВЛИВАЕМ ЧАТ
        setChat(JSON.parse(saved));
        setShowSelector(false);
      } else {
        // если истории нет — начинаем новый диалог
        setShowSelector(true);
      }
    })();
  }, []);

  // ======================================================
  // 🟦 ШАГ 2 — Восстановление из Summary
  // ======================================================
  useEffect(() => {
    (async () => {
      const flag = await AsyncStorage.getItem("restoreFromSummary");
      if (flag === "1") {
        const id = await AsyncStorage.getItem("conversationId");
        if (id) {
          const saved = await AsyncStorage.getItem(`chatHistory:${id}`);
          if (saved) {
            setChat(JSON.parse(saved));
            setShowSelector(false);
          }
        }
        await AsyncStorage.removeItem("restoreFromSummary");
      }
    })();
  }, []);

  // ======================================================
  // 🟦 Загрузка активного питомца
  // ======================================================
  useEffect(() => {
    async function loadPet() {
      try {
        if (petParam) {
          const parsed = JSON.parse(petParam) as Pet;
          setPet(parsed);
        } else {
          const activeId = await getActivePetId();
          const allPets = await getPets();

          if (activeId && allPets.length > 0) {
            const found = allPets.find((p) => p.id === activeId) || null;
            setPet(found);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки питомца:", err);
      }
    }
    loadPet();
  }, [petParam]);

  // ======================================================
  // 🟦 Обработка выбора симптомов — старт нового диалога
  // ======================================================
  const handleSymptomSubmit = async (selected: string[], customSymptom?: string) => {
    setShowSelector(false);
    setChat([]);

    try {
      setLoading(true);

      const allSymptoms = [...selected];
      if (customSymptom) allSymptoms.push(customSymptom.trim());

      const result = await chatWithGPT({
        message: "",
        pet: pet || undefined,
        symptomKeys: allSymptoms,
      });

      const replyText =
        typeof result === "object"
          ? result.reply || result.error || "⚠️ Ошибка при анализе"
          : String(result);

      setChat([{ role: "assistant", content: replyText }]);
    } catch (error) {
      console.error("Ошибка reasoning:", error);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // 🟦 Отправка сообщения пользователем
  // ======================================================
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setChat((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput("");

    try {
      setLoading(true);

      const result = await chatWithGPT({
        message: messageToSend,
        pet: pet || undefined,
      });

      const assistantText =
        typeof result === "object"
          ? result.reply || result.error || "⚠️ Нет ответа"
          : String(result);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantText,
      };

      setChat((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Ошибка отправки:", err);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // 🟦 UI
  // ======================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {showSelector ? (
          <SymptomSelector onSubmit={handleSymptomSubmit} />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={chat.filter((m) => m.role !== "system")}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.message,
                    item.role === "user" ? styles.userMsg : styles.assistantMsg,
                  ]}
                >
                  <Text style={styles.msgText}>{item.content}</Text>
                </View>
              )}
              contentContainerStyle={[
                styles.messagesContainer,
                { paddingBottom: inputHeight + insets.bottom + 12 },
              ]}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />

            <View
              style={styles.inputArea}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={i18n.t("chat.placeholder")}
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, loading && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#42A5F5" />
                ) : (
                  <Ionicons name="arrow-up-circle" size={32} color="#42A5F5" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  messagesContainer: { padding: 12 },
  message: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMsg: {
    backgroundColor: "#E3F2FD",
    alignSelf: "flex-end",
  },
  assistantMsg: {
    backgroundColor: "#F0F0F0",
    alignSelf: "flex-start",
  },
  msgText: { fontSize: 15, color: "#333" },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f9f9f9",
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

