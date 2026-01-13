import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams, useNavigation } from "expo-router";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { exportSummaryPDF } from "../utils/exportPDF";
import type { Pet } from "../types/pet";
import { chatWithGPT } from "../utils/chatWithGPT";
import { getActivePetId, getPets } from "../utils/pets";

import MenuButton from "../components/ui/MenuButton";
import LocalizedExitButton from "../components/ui/LocalizedExitButton";


type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const THINKING_HINT_KEYS = [
  "chat.waiting.hint1",
  "chat.waiting.hint2",
  "chat.waiting.hint3",
  "chat.waiting.hint4",
];


export default function ChatScreen() {
  const navigation = useNavigation();
  const { pet: petParam } = useLocalSearchParams<{ pet?: string }>();
  const lang = (i18n.locale || "").split("-")[0];
  const isRTL = lang === "he";


  const [pet, setPet] = useState<Pet | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingHint, setThinkingHint] = useState<string | null>(null);
  const [showPdfCta, setShowPdfCta] = useState(false);
  const [pdfConversationId, setPdfConversationId] = useState<string | null>(null);



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
  // 🟦 UX: подсказки во время ожидания ответа (UI-слой)
  // ======================================================
  useEffect(() => {
    if (!loading) {
      setThinkingHint(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      const first = i18n.t("chat.waiting.hint1");
      setThinkingHint(first);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [loading]);


  // ======================================================
  // 🟦 Обработка выбора симптомов — старт нового диалога
  // ======================================================
  const handleSymptomSubmit = async (selected: string[], customSymptom?: string) => {
    setShowSelector(false);
    setChat([]);
    setShowPdfCta(false);
    setPdfConversationId(null);


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
      if (typeof result === "object" && result?.sessionEnded) {
        setShowPdfCta(true);
        setPdfConversationId(result.conversationId ?? null);
      }

    } catch (error) {
      console.error("Ошибка reasoning:", error);
    } finally {
      setLoading(false);
    }
  };

    // ======================================================
    // 🟦 Отправка сообщения пользователем
    // ======================================================
    // 🟦 Отправка сообщения пользователем
    // ======================================================
    const handleSend = async () => {
      if (!input.trim()) return;

      const messageToSend = input.trim();
      const userMessage: ChatMessage = { role: "user", content: messageToSend };

      setChat((prev) => [...prev, userMessage]);
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

        // PDF CTA: показываем только если агент явно финализировал
        if (typeof result === "object" && result?.sessionEnded) {
          setShowPdfCta(true);
          setPdfConversationId(result.conversationId ?? null);
        } else {
          setShowPdfCta(false);
          setPdfConversationId(null);
        }
      } catch (err) {
        console.error("Ошибка отправки:", err);
      } finally {
        setLoading(false);
      }
    };

    // ======================================================
    // 🟦 Header logic: Menu on selector, Exit in chat
    // ======================================================
    useLayoutEffect(() => {
      navigation.setOptions({
        headerBackVisible: false,
        headerLeft: () => null,
        headerRight: () => (showSelector ? <MenuButton /> : <LocalizedExitButton />),
      });
    }, [navigation, showSelector]);


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
                    isRTL ? styles.messageRTL : undefined,
                  ]}
                >
                  <Text style={[styles.msgText, isRTL ? styles.msgTextRTL : undefined]}>
                    {item.content}
                  </Text>
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
            {loading && (
              <View style={[styles.message, styles.assistantMsg, styles.waitingBubble]}>
                <View style={[styles.waitingRow, isRTL && styles.waitingRowRTL]}>
                  <ActivityIndicator />
                  {!!thinkingHint && (
                    <Text style={[styles.waitingText, isRTL && styles.waitingTextRTL]}>
                      {thinkingHint}
                    </Text>
                  )}

                </View>
              </View>
            )}
            {showPdfCta && (
              <View style={styles.pdfCta}>
                <Text style={styles.pdfCtaTitle}>{i18n.t("chat.pdf_ready")}</Text>

                <View style={styles.pdfCtaRow}>
                  <TouchableOpacity
                    style={styles.pdfBtn}
                    onPress={async () => {
                      const id = pdfConversationId ?? (await AsyncStorage.getItem("conversationId"));
                      if (id) await exportSummaryPDF(id);
                    }}
                  >
                    <Text style={styles.pdfBtnText}>{i18n.t("chat.open_pdf")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pdfBtn}
                    onPress={async () => {
                      const id = pdfConversationId ?? (await AsyncStorage.getItem("conversationId"));
                      if (id) await exportSummaryPDF(id);
                    }}
                  >
                    <Text style={styles.pdfBtnText}>{i18n.t("chat.share_pdf")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View
              style={styles.inputArea}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
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
  waitingBubble: {
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginBottom: 6,
  },

  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  waitingText: {
    fontSize: 14,
    color: "#555",
    flexShrink: 1,
    marginLeft: 8,
  },
  msgTextRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  inputRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  waitingRowRTL: {
    flexDirection: "row-reverse",
  },
  waitingTextRTL: {
    textAlign: "right",
    marginLeft: 0,
    marginRight: 8,
    writingDirection: "rtl",
  },
  messageRTL: {
    writingDirection: "rtl",
    alignItems: "flex-end",
  },
  pdfCta: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  pdfCtaText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  pdfCtaButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  pdfBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#42A5F5",
    marginRight: 8,
  },
  pdfBtnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pdfBtnSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#42A5F5",
  },
  pdfBtnSecondaryText: {
    color: "#42A5F5",
    fontSize: 14,
    fontWeight: "600",
  },
  pdfCtaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  pdfCtaRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  pdfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#42A5F5",
    marginHorizontal: 6,
  },
  pdfBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },                     

});

