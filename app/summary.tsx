// app/summary.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { chatWithGPT, restoreSession } from "../utils/chatWithGPT";
import i18n from "../i18n";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";

// PDF util
import { exportSummaryPDF } from "../utils/exportPDF";
// modal
import LoadingPDF from "../components/ui/LoadingPDF";

type SummaryItem = {
  id: string;
  date: string | number;
  petName: string;
  symptomKeys?: string[];
};

// перевод с fallback
const t = (k: string, def: string) => i18n.t(k, { defaultValue: def });

async function getPetByName(petName: string) {
  try {
    const petsRaw = await AsyncStorage.getItem("pets:list");
    const pets = petsRaw ? JSON.parse(petsRaw) : [];
    if (!Array.isArray(pets)) return null;
    return pets.find((p: any) => p?.name === petName) ?? null;
  } catch {
    return null;
  }
}

async function buildConversationHistoryTail(conversationId: string, max = 20) {
  try {
    const raw =
      (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) ||
      (await AsyncStorage.getItem(`chat:history:${conversationId}`)) ||
      "[]";

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "",
      }))
      .filter((m: any) => m.content.trim().length > 0)
      .slice(-max);
  } catch {
    return [];
  }
}

async function ensureDecisionTreeCachedForSummary(
  conversationId: string,
  petName: string
) {
  const locale =
    (await AsyncStorage.getItem("pdfLanguage")) ||
    i18n.locale ||
    "en";

  const dtKey = `decisionTree:${conversationId}:${locale}`;
  const raw = await AsyncStorage.getItem(dtKey);

  if (raw) return;

  const conversationHistory = await buildConversationHistoryTail(conversationId, 20);
  const pet = await getPetByName(petName);

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

  const currentHistory =
    (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) ||
    (await AsyncStorage.getItem(`chat:history:${conversationId}`)) ||
    "[]";

  let messagesCount = 0;
  try {
    const parsedHistory = JSON.parse(currentHistory);
    messagesCount = Array.isArray(parsedHistory) ? parsedHistory.length : 0;
  } catch {}

  await AsyncStorage.setItem(
    dtKey,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      messagesCount,
      decisionTree,
    })
  );
}

export default function SummaryScreen() {
  const [sessions, setSessions] = useState<SummaryItem[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLangModalVisible, setPdfLangModalVisible] = useState(false);
  const [pendingPdfItem, setPendingPdfItem] = useState<SummaryItem | null>(null);
  const [currentPdfLang, setCurrentPdfLang] = useState<string>("en");
  const router = useRouter();

  // =========================
  // LOAD SUMMARY
  // =========================
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem("chatSummary");
        const parsed: any[] = stored ? JSON.parse(stored) : [];

        const normalized: SummaryItem[] = parsed
          .map((rec: any) => ({
            id: rec.id || rec.conversationId || String(Date.now()),
            date: rec.date || rec.timestamp || Date.now(),
            petName:
              rec.pet?.name ||
              rec.petName ||
              t("chat.pet_default", "Pet"),
            symptomKeys: rec.symptomKeys || rec.symptoms || [],
          }))
          .reverse();

        setSessions(normalized);
      } catch (err) {
        console.error("❌ Ошибка загрузки chatSummary:", err);
      }
    };
    load();
  }, []);

  // =========================
  // RESUME SESSION
  // =========================
  const handleResume = async (item: SummaryItem) => {
    try {
      await AsyncStorage.setItem(
        "symptomKeys",
        JSON.stringify(item.symptomKeys || [])
      );
      await AsyncStorage.setItem("restoreFromSummary", "1");

      const petsRaw = await AsyncStorage.getItem("pets:list");
      const pets = petsRaw ? JSON.parse(petsRaw) : [];
      const found = pets.find((p: any) => p.name === item.petName);
      if (found) {
        await AsyncStorage.setItem("pets:activeId", found.id);
      }

      await restoreSession(item.id);
      router.replace("/chat");
    } catch (err) {
      Alert.alert(
        t("menu.summary", "History"),
        t("privacy_paragraph2", "If you agree, let's continue together.")
      );
    }
  };

  // =========================
  // DELETE SESSION
  // =========================
  const handleDelete = async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem("chatSummary");
      const parsed: SummaryItem[] = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((rec) => rec.id !== id);

      await AsyncStorage.setItem("chatSummary", JSON.stringify(updated));
      await AsyncStorage.removeItem(`chatHistory:${id}`);

      setSessions(updated);
    } catch (err) {
      Alert.alert(
        t("menu.summary", "History"),
        t("privacy_paragraph2", "If you agree, let's continue together.")
      );
    }
  };

  // =========================
  // PDF EXPORT
  // =========================
  const handleExportPDF = async (id: string, petName: string) => {
    try {
      setPdfLoading(true);
      await ensureDecisionTreeCachedForSummary(id, petName);
      await exportSummaryPDF(id);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // =========================
  // LIST ITEM
  // =========================
  const renderItem = ({ item }: { item: SummaryItem }) => {
    // показываем только ПЕРВЫЙ симптом в списке
    const firstKey = item.symptomKeys && item.symptomKeys[0];
    const firstSymptomLabel = firstKey
      ? t(`symptoms.${firstKey}`, firstKey)
      : "—";

    return (
      <View style={styles.item}>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.petName}>
            {item.petName}
          </ThemedText>

          <ThemedText style={styles.symptoms} numberOfLines={1}>
            {firstSymptomLabel}
          </ThemedText>

          <ThemedText style={styles.date}>
            {new Date(item.date).toLocaleString(i18n.locale || "en")}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleResume(item)}
            style={styles.iconButton}
          >
            <MaterialIcons
              name="play-circle-outline"
              size={26}
              color="#007AFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const savedPdfLang =
                (await AsyncStorage.getItem("pdfLanguage")) ||
                i18n.locale ||
                "en";

              setCurrentPdfLang(savedPdfLang);
              setPendingPdfItem(item);
              setPdfLangModalVisible(true);
            }}
            style={styles.iconButton}
          >
            <MaterialIcons name="picture-as-pdf" size={26} color="#E53935" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={styles.iconButton}
          >
            <MaterialIcons name="delete-outline" size={26} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  // =========================
  // RENDER
  // =========================
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("menu.saved_sessions", "Consultation history")}
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../assets/images/on1.png")} // ← твоя картинка
            style={styles.emptyImage}
            resizeMode="contain"
          />

          <Text style={styles.emptyTitle}>
            {i18n.t("summary.empty_title")}
          </Text>

          <Text style={styles.emptyText}>
            {i18n.t("summary.empty_subtitle")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
        />
      )}


      <Modal transparent animationType="fade" visible={pdfLangModalVisible}>
        <View style={styles.overlay}>
          <View style={styles.box}>
            <Text style={styles.text}>
              {i18n.t("pdf.language_title", { defaultValue: "Language of the PDF" })}
            </Text>

              <View style={styles.pdfLangRow}>
                {["de", "en", "es", "fr", "he", "it", "ru"].map((langCode) => (
                  <TouchableOpacity
                    key={langCode}
                    style={styles.pdfLangChip}
                    onPress={async () => {
                      await AsyncStorage.setItem("pdfLanguage", langCode);
                      setCurrentPdfLang(langCode);
                      setPdfLangModalVisible(false);

                      setTimeout(async () => {
                        if (pendingPdfItem) {
                          await handleExportPDF(
                            pendingPdfItem.id,
                            pendingPdfItem.petName
                          );
                        }
                      }, 600);
                    }}
                  >
                    <Text
                      style={[
                        styles.pdfLangChipText,
                        currentPdfLang === langCode && styles.pdfLangChipTextActive,
                      ]}
                    >
                      {langCode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            <TouchableOpacity
              style={styles.pdfLangCancel}
              onPress={() => {
                setPdfLangModalVisible(false);
                setPendingPdfItem(null);
              }}
            >
              <Text style={styles.pdfLangCancelText}>
                {i18n.t("cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔥 МОДАЛКА ЗАГРУЗКИ PDF */}
      <LoadingPDF visible={pdfLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#333",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  info: {
    flexDirection: "column",
  },
  petName: {
    fontWeight: "600",
    fontSize: 16,
    color: "#333",
  },
  date: {
    fontSize: 13,
    color: "#666",
  },
  symptoms: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  empty: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    marginTop: 50,
  },
  emptyContainer: {
    //flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyImage: {
    width: "100%",
    maxWidth: 360,
    height: 220,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    color: "#666",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  box: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    width: 240,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  pdfLangRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  pdfLangChip: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  pdfLangChipText: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
  },
  pdfLangChipTextActive: {
    color: "#42A5F5",
    fontWeight: "600",
  },
  pdfLangCancel: {
    marginTop: 10,
    paddingTop: 6,
  },
  pdfLangCancelText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },

});
