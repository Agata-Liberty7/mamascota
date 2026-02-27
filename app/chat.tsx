import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import LoadingPDF from "../components/ui/LoadingPDF";

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
  ts?: number; // timestamp (ms)
};


const THINKING_HINT_KEYS = [
  "chat.waiting.hint1",
  "chat.waiting.hint2",
  "chat.waiting.hint3",
  "chat.waiting.hint4",
];
// --------------------
// Timestamps + progress (UI-only)
// --------------------
const SHOW_TIMESTAMPS = true; // позже можно вынести в Settings
const MAX_ASSISTANT_TURNS = 10; // “длина диалога” в шагах

function formatChatTime(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString(i18n.locale || "en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
function splitAssistantReplyIntoBubbles(reply: string): string[] {
  if (typeof reply !== "string") return [];

  const raw = reply.trim();
  if (!raw) return [];

  return raw
    .split("[CHUNK]")
    .map((s) =>
      s
        // удаляем остатки маркера если вдруг он продублировался
        .replace(/\[CHUNK\]/gi, "")
        // удаляем строки из одной скобки
        .replace(/^\s*[\[\]]\s*$/gm, "")
        // удаляем скобки если они “прилипли” к краю блока
        .replace(/^\s*\[+\s*/g, "")
        .replace(/\s*\]+\s*$/g, "")
        .trim()
    )
    .filter(Boolean);
}


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
  const [pdfConversationId, setPdfConversationId] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [phase, setPhase] = useState<"intake" | "clarify" | "summary" | "ended" | null>(null);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [isDecisionTreeStale, setIsDecisionTreeStale] = useState(false);

  // 🔥 ВАЖНО: по умолчанию не показываем селектор
  const [showSelector, setShowSelector] = useState<boolean>(false);

  const [inputHeight, setInputHeight] = useState(56);
  const flatListRef = useRef<FlatList>(null);
  const waitingHintIdxRef = useRef(0);


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
        try {
          const parsed = JSON.parse(saved);
          const normalized = Array.isArray(parsed)
            ? parsed.flatMap((m: any) => {
                const role = m?.role;
                const ts = typeof m?.ts === "number" ? m.ts : undefined;
                const content = typeof m?.content === "string" ? m.content : "";

              // ✅ если ответ можно разделить на части — разворачиваем в несколько пузырей
              if (role === "assistant") {
                const parts = splitAssistantReplyIntoBubbles(content);
                if (parts.length > 1) {
                  const base = ts ?? Date.now();
                  return parts.map((p, idx) => ({
                    role: "assistant" as const,
                    content: p,
                    ts: base + idx,
                  }));
                }
              }

                return [{ role, content, ts }];
              })
            : [];

          setChat(normalized);

        } catch {
          setChat([]);
        }

        setShowSelector(false);
        await refreshPdfReadyState(id);

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
            try {
              const parsed = JSON.parse(saved);

              const normalized = Array.isArray(parsed)
                ? parsed.flatMap((m: any) => {
                    const role = m?.role;
                    const ts = typeof m?.ts === "number" ? m.ts : undefined;
                    const content = typeof m?.content === "string" ? m.content : "";

                    // ✅ если ассистент сохранился с [[CHUNK]] — разворачиваем в несколько пузырей
                    if (role === "assistant" && content.includes("[[CHUNK]]")) {
                      const parts = splitAssistantReplyIntoBubbles(content);
                      const base = ts ?? Date.now();
                      return parts.map((p, idx) => ({
                        role: "assistant" as const,
                        content: p,
                        ts: base + idx,
                      }));
                    }

                    return [
                      {
                        role,
                        content,
                        ts,
                      },
                    ];
                  })
                : [];

              setChat(normalized);
            } catch {
              setChat([]);
            }

            setShowSelector(false);

            // ✅ чтобы PDF-кнопка корректно восстанавливалась после возврата из Summary
            setPdfConversationId(id);
            await refreshPdfReadyState(id);
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
  const WAITING_HINT_IDX_KEY = "ui:waitingHintIdx";

async function pickWaitingHintOnce(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(WAITING_HINT_IDX_KEY);
    const idx = Number(raw || "0");
    const safeIdx = Number.isFinite(idx) ? idx : 0;

    const key = THINKING_HINT_KEYS[safeIdx % THINKING_HINT_KEYS.length];
    // следующий раз будет другой (но только на следующий запрос)
    await AsyncStorage.setItem(WAITING_HINT_IDX_KEY, String(safeIdx + 1));

    return i18n.t(key);
  } catch {
    return i18n.t(THINKING_HINT_KEYS[0]);
  }
}

useEffect(() => {
  if (!loading) {
    setThinkingHint(null);
    return;
  }

  let cancelled = false;

  // чтобы не мигало при быстрых ответах
  const t = setTimeout(() => {
    if (cancelled) return;

    const key = THINKING_HINT_KEYS[waitingHintIdxRef.current % THINKING_HINT_KEYS.length];
    waitingHintIdxRef.current += 1;

    setThinkingHint(i18n.t(key));
  }, 600);

  return () => {
    cancelled = true;
    clearTimeout(t);
  };
}, [loading, i18n.locale]);



  // ======================================================
  // 🟦 Обработка выбора симптомов — старт нового диалога
  // ======================================================
  const handleSymptomSubmit = async (selected: string[], customSymptom?: string) => {
    setShowSelector(false);
    setChat([]);
    setPdfConversationId(null);


    try {
      // ✅ сразу объясняем пользователю, почему старт может быть длинным
      setPhase("intake");
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

      const parts = splitAssistantReplyIntoBubbles(replyText);
      const now = Date.now();

      setChat(
        parts.map((content, idx) => ({
          role: "assistant",
          content,
          ts: now + idx, // микро-сдвиг, чтобы порядок был стабильным
        }))
      );

      // PDF CTA: показываем только если агент явно финализировал
      if (typeof result === "object" && result?.sessionEnded) {
        const cid = result.conversationId ?? null;
        setPdfConversationId(cid);
        await refreshPdfReadyState(cid);
      } else {
        setPdfConversationId(null);
        setIsPdfReady(false);
      }

      if (typeof result === "object" && result?.phase) {
        setPhase(result.phase);
      } else {
        setPhase(null);
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
    const handleSend = async () => {
      if (!input.trim()) return;

      const messageToSend = input.trim();

      const userMessage: ChatMessage = {
        role: "user",
        content: messageToSend,
        ts: Date.now(),
      };

      // 1) UI: сразу показываем сообщение пользователя
      setChat((prev) => [...prev, userMessage]);
      setInput("");

      try {
        // 2) UI: начинаем ожидание
        setLoading(true);

        // 3) Запрос к агенту
        const result = await chatWithGPT({
          message: messageToSend,
          pet: pet || undefined,
        });

        // 4) Текст ответа
        const assistantText =
          typeof result === "object"
            ? (result.reply || result.error || i18n.t("chat.no_reply", { defaultValue: "⚠️ No reply" }))
            : String(result);

        const parts = splitAssistantReplyIntoBubbles(String(assistantText));
        const now = Date.now();

        setChat((prev) => [
          ...prev,
          ...parts.map((content, idx) => ({
            role: "assistant" as const,
            content,
            ts: now + idx,
          })),
        ]);


        // 6) Phase: обновляем только если пришло валидное значение
        const p = typeof result === "object" ? (result as any)?.phase : null;
        if (p === "intake" || p === "clarify" || p === "summary" || p === "ended") {
          setPhase(p);
        }
        // ⚠️ НЕ сбрасываем phase в null, чтобы шапка не мигала

        // 7) PDF
        if (typeof result === "object" && result?.sessionEnded) {
          const cid = result.conversationId ?? null;
          setPdfConversationId(cid);
          await refreshPdfReadyState(cid);
        } else {
          // ✅ НЕ сбрасываем уже готовый PDF после продолжения диалога
          // Если decisionTree уже был — помечаем, что он может устареть
          if (isPdfReady) {
            setIsDecisionTreeStale(true);
          }
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

  // ------------------------------------------------------
  // PDF: save session silently + generate (UI-only, no navigation)
  // ------------------------------------------------------
  async function getUnifiedActivePetLocal(): Promise<any | null> {
    try {
      const [listRaw, activeId] = await Promise.all([
        AsyncStorage.getItem("pets:list"),
        AsyncStorage.getItem("pets:activeId"),
      ]);
      if (!listRaw || !activeId) return null;
      const list = JSON.parse(listRaw);
      if (!Array.isArray(list)) return null;
      return list.find((p: any) => p?.id === activeId) ?? null;
    } catch {
      return null;
    }
  }

  async function refreshPdfReadyState(conversationId: string | null) {
    try {
      if (!conversationId) {
        setIsPdfReady(false);
        return;
      }
      const locale = i18n.locale || "en";
      const dtKey = `decisionTree:${conversationId}:${locale}`;
      const raw = await AsyncStorage.getItem(dtKey);
      setIsPdfReady(!!raw);
    } catch {
      setIsPdfReady(false);
    }
  }
  function buildConversationHistoryTail(max = 20) {
  const trimmed = chat
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    }))
    .filter((m) => m.content.trim().length > 0);

  return trimmed.slice(-max);
}

async function ensureDecisionTreeCached(conversationId: string) {
  const locale = i18n.locale || "en";
  const dtKey = `decisionTree:${conversationId}:${locale}`;

  // если есть кэш и он не помечен как stale — ничего не делаем
  const raw = await AsyncStorage.getItem(dtKey);
  if (raw && !isDecisionTreeStale) return;

  const conversationHistory = buildConversationHistoryTail(20);

  const dtRes = await chatWithGPT({
    message: "__MAMASCOTA_DECISION_TREE__",
    conversationId,
    userLang: locale,
    conversationHistory,
    pet: pet || undefined,
  });

  if (!dtRes || typeof dtRes !== "object" || !dtRes.ok) {
    throw new Error(
      (dtRes && typeof dtRes === "object" && (dtRes as any).error) ||
        "decisionTree request failed"
    );
  }

  const decisionTree = (dtRes as any).decisionTree ?? null;

  await AsyncStorage.setItem(
    dtKey,
    JSON.stringify({ createdAt: new Date().toISOString(), decisionTree })
  );

  setIsPdfReady(true);
  setIsDecisionTreeStale(false);
}

  async function saveSessionSilently(conversationId: string) {
    // 1) гарантируем, что история есть в AsyncStorage
    const keyA = `chatHistory:${conversationId}`;
    const keyB = `chat:history:${conversationId}`;

    const existing =
      (await AsyncStorage.getItem(keyA)) ?? (await AsyncStorage.getItem(keyB));

    if (!existing) {
      // если по какой-то причине история ещё не сохранилась — сохраним текущее состояние UI
      const filtered = chat
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "",
          ts: typeof (m as any).ts === "number" ? (m as any).ts : undefined,
        }));

      await AsyncStorage.setItem(keyA, JSON.stringify(filtered));
      try {
        await AsyncStorage.setItem(keyB, JSON.stringify(filtered));
      } catch {}
    }

    // 2) symptomKeys — как в handleExitAction
    const symptomsRaw =
      (await AsyncStorage.getItem("selectedSymptoms")) ??
      (await AsyncStorage.getItem("symptomKeys")) ??
      (await AsyncStorage.getItem("symptoms"));

    const symptomKeys: string[] = symptomsRaw ? JSON.parse(symptomsRaw) : [];

    // 3) petName
    const activePet = pet ?? (await getUnifiedActivePetLocal());
    const petName = activePet?.name?.trim() || i18n.t("chat.pet_default", { defaultValue: "Pet" });

    // 4) context — последняя реплика пользователя (если есть)
    const lastUser = [...chat].reverse().find((m) => m?.role === "user" && String(m.content || "").trim());
    const context = (lastUser?.content || "").slice(0, 120) || i18n.t("summary.no_description", { defaultValue: "No description" });

    const record = {
      id: conversationId,
      date: new Date().toISOString(),
      petName,
      context,
      symptomKeys,
    };

    // 5) upsert в chatSummary
    const stored = (await AsyncStorage.getItem("chatSummary")) || "[]";
    const parsed = JSON.parse(stored);
    const list = Array.isArray(parsed) ? parsed : [];
    const filtered = list.filter((rec: any) => rec?.id !== conversationId);
    filtered.unshift(record);

    await AsyncStorage.setItem("chatSummary", JSON.stringify(filtered));
    await AsyncStorage.setItem("lastChatSessionExists", "1");
  }

  const handlePdfNow = async () => {
    if (pdfGenerating) return;

    try {
      setPdfGenerating(true);

      const id =
        pdfConversationId ??
        (await AsyncStorage.getItem("conversationId")) ??
        null;

      if (!id) {
        alert(i18n.t("chat.pdf_no_session", { defaultValue: "No active session yet." }));
        return;
      }

      // ✅ 1) гарантируем, что decisionTree есть (или пересчитаем, если stale/нет кэша)
      await ensureDecisionTreeCached(id);

      // ✅ 2) тихо сохранили → генерим pdf
      await saveSessionSilently(id);
      await exportSummaryPDF(id);

      // на всякий: обновим флаг готовности
      await refreshPdfReadyState(id);
    } catch (e) {
      console.error("❌ PDF now error:", e);
      alert(i18n.t("chat.pdf_error", { defaultValue: "Could not generate PDF." }));
    } finally {
      setPdfGenerating(false);
    }
  };
  const isWaitingForSummary = loading && !pdfGenerating && (phase === "summary" || phase === "ended");
  const waitingText = isWaitingForSummary
    ? i18n.t("chat.waiting.summary")
    : thinkingHint;
    
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
        <LoadingPDF visible={pdfGenerating} />

        {showSelector ? (
          <SymptomSelector onSubmit={handleSymptomSubmit} />
        ) : (
          <>
            {(phase || loading) && (
              <View style={styles.progressWrap}>
                <Text style={styles.progressText}>
                  {i18n.t(`chat.phase.${phase ?? "intake"}`)}
                </Text>
              </View>
            )}


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

                  {SHOW_TIMESTAMPS && !!item.ts && (
                    <Text style={[styles.msgTime, isRTL ? styles.msgTimeRTL : undefined]}>
                      {formatChatTime(item.ts)}
                    </Text>
                  )}
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
            {loading && !pdfGenerating && (
              <View style={[styles.message, styles.assistantMsg, styles.waitingBubble]}>
                <View style={[styles.waitingRow, isRTL && styles.waitingRowRTL]}>
                  <ActivityIndicator />
                  {!!waitingText && (
                    <Text style={[styles.waitingText, isRTL && styles.waitingTextRTL]}>
                      {waitingText}
                    </Text>
                  )}

                </View>
              </View>
        )}
        {phase === "ended" && (
          <View style={styles.summaryHint}>
            <Text style={styles.summaryHintText}>
              {i18n.t("chat.summary_hint", {
                defaultValue:
                  "You can save the summary using the red icon at the bottom left, or by exiting and saving the session.",
              })}
            </Text>
          </View>
        )}

        <View
          style={styles.inputArea}
          onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
        >
          {(() => {
        const isPdfEnabled = !!pdfConversationId; // ✅ включаем по факту финализации
        const isDisabled = !isPdfEnabled || loading || pdfGenerating;

        return (
          <TouchableOpacity
            style={[
              styles.pdfQuickBtn,
              isDisabled && { opacity: 0.35 },
            ]}
            onPress={handlePdfNow}
            disabled={isDisabled}
          >
            <MaterialIcons
              name="picture-as-pdf"
              size={26}
              color={isPdfEnabled ? "#E53935" : "#BDBDBD"}
            />
          </TouchableOpacity>
        );
      })()}



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
  summaryHint: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  summaryHintText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
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
  progressWrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  progressSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },
  msgTime: {
    marginTop: 6,
    fontSize: 11,
    color: "#777",
    alignSelf: "flex-end",
  },
  msgTimeRTL: {
    alignSelf: "flex-start",
    textAlign: "right",
    writingDirection: "rtl",
  }, 
  pdfQuickBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
                 
});

