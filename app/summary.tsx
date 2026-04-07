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
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { chatWithGPT, restoreSession } from "../utils/chatWithGPT";
import i18n from "../i18n";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";

// PDF util
import {
  exportSummaryPDF,
  exportObservationDiaryPDF,
  exportObservationDiaryCSV,
} from "../utils/exportPDF";
// modal
import LoadingPDF from "../components/ui/LoadingPDF";
import { canGeneratePdf, incrementPdfCount } from "../utils/access";

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

    if (raw) {
      try {
        const currentHistoryRaw =
          (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) ||
          (await AsyncStorage.getItem(`chat:history:${conversationId}`)) ||
          "[]";

        let currentMessagesCount = 0;
        try {
          const parsedHistory = JSON.parse(currentHistoryRaw);
          currentMessagesCount = Array.isArray(parsedHistory) ? parsedHistory.length : 0;
        } catch {}

        const parsedDt = JSON.parse(raw);
        const savedMessagesCount =
          typeof parsedDt?.messagesCount === "number" ? parsedDt.messagesCount : -1;

        const hasNewMessages =
          savedMessagesCount >= 0 && currentMessagesCount > savedMessagesCount;

        if (!hasNewMessages) {
          return;
        }
      } catch {
        // если кэш битый или не удалось сравнить — пересобираем
      }
    }

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

async function isSessionPdfAllowed(conversationId: string) {
  try {
    const raw = await AsyncStorage.getItem(`pdfAllowed:${conversationId}`);
    return raw === "1";
  } catch {
    return false;
  }
}

export default function SummaryScreen() {
  const [sessions, setSessions] = useState<SummaryItem[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfTextKey, setPdfTextKey] = useState<"pdf.generating" | "pdf.preparing_language">("pdf.generating");
  const [pdfLangModalVisible, setPdfLangModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [pendingPdfItem, setPendingPdfItem] = useState<SummaryItem | null>(null);
  const [pendingPdfType, setPendingPdfType] = useState<"summary" | "diary" | null>(null);
  const [pendingCsvItem, setPendingCsvItem] = useState<SummaryItem | null>(null);
  const [shouldStartCsvExport, setShouldStartCsvExport] = useState(false);
  const [currentPdfLang, setCurrentPdfLang] = useState<string>("en");
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
                      label: String(i18n.t("ok_button", { defaultValue: "OK" })),
                    },
                  ],
          },
        })
      );
    });
  };



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
      if (Platform.OS === "web") {
        await showWebConfirm({
          title: String(t("menu.summary", "History")),
          message: String(t("privacy_paragraph2", "If you agree, let's continue together.")),
        });
      } else {
        Alert.alert(
          String(t("menu.summary", "History")),
          String(t("privacy_paragraph2", "If you agree, let's continue together."))
        );
      }
    }
  };

  // =========================
  // DELETE SESSION
  // =========================
  const handleDelete = async (id: string) => {
    const performDelete = async () => {
      const stored = await AsyncStorage.getItem("chatSummary");
      const parsed: SummaryItem[] = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((rec) => rec.id !== id);

      await AsyncStorage.setItem("chatSummary", JSON.stringify(updated));
      await AsyncStorage.removeItem(`chatHistory:${id}`);
      await AsyncStorage.removeItem(`chat:history:${id}`);

      setSessions(updated);
    };

    try {
      if (Platform.OS === "web") {
        await new Promise<void>((resolve) => {
          (window as any).__MAMASCOTA_CONFIRM_RESOLVE__ = async (actionKey?: string) => {
            try {
              if (actionKey === "delete") {
                await performDelete();
              }
            } finally {
              resolve();
            }
          };

          window.dispatchEvent(
            new CustomEvent("mamascota:confirm", {
              detail: {
                title: String(i18n.t("alert_title", { defaultValue: "Attention" })),
                message: String(
                  i18n.t("summary.delete_confirm", {
                    defaultValue: "Delete this saved session?",
                  })
                ),
                buttons: [
                  {
                    key: "cancel",
                    label: String(i18n.t("cancel", { defaultValue: "Cancel" })),
                  },
                  {
                    key: "delete",
                    label: String(i18n.t("delete", { defaultValue: "Delete" })),
                  },
                ],
              },
            })
          );
        });
      } else {
        Alert.alert(
          String(i18n.t("alert_title", { defaultValue: "Attention" })),
          String(
            i18n.t("summary.delete_confirm", {
              defaultValue: "Delete this saved session?",
            })
          ),
          [
            {
              text: String(i18n.t("cancel", { defaultValue: "Cancel" })),
              style: "cancel",
            },
            {
              text: String(i18n.t("delete", { defaultValue: "Delete" })),
              style: "destructive",
              onPress: () => {
                void performDelete();
              },
            },
          ]
        );
      }
    } catch (err) {
      if (Platform.OS === "web") {
        await showWebConfirm({
          title: String(i18n.t("alert_title", { defaultValue: "Attention" })),
          message: String(
            i18n.t("summary.delete_error", {
              defaultValue: "Could not delete the saved session. Please try again.",
            })
          ),
        });
      } else {
        Alert.alert(
          String(i18n.t("alert_title", { defaultValue: "Attention" })),
          String(
            i18n.t("summary.delete_error", {
              defaultValue: "Could not delete the saved session. Please try again.",
            })
          )
        );
      }
    }
  };

  // =========================
  // PDF EXPORT
  // =========================
  const handleExportPDF = async (id: string, petName: string) => {
    try {
      const allowed = await isSessionPdfAllowed(id);

      if (!allowed) {
        if (Platform.OS === "web") {
          await showWebConfirm({
            title: String(t("alert_title", "Attention")),
            message: String(
              i18n.t("chat.pdf_not_ready", {
                defaultValue:
                  "The consultation is not finished yet. Complete it to generate a report.",
              })
            ),
          });
        } else {
          Alert.alert(
            String(t("alert_title", "Attention")),
            String(
              i18n.t("chat.pdf_not_ready", {
                defaultValue:
                  "The consultation is not finished yet. Complete it to generate a report.",
              })
            )
          );
        }
        return;
      }

      const accessAllowed = await canGeneratePdf();

      if (!accessAllowed) {
        if (Platform.OS === "web") {
          const result = await showWebConfirm({
            title: String(t("alert_title", "Attention")),
            message: String(
              i18n.t("paywall_limit_reached", {
                defaultValue: "Free limit reached. Upgrade to continue.",
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
            router.push("/paywall");
          }
        } else {
          Alert.alert(
            String(t("alert_title", "Attention")),
            String(
              i18n.t("paywall_limit_reached", {
                defaultValue: "Free limit reached. Upgrade to continue.",
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
                  router.push("/paywall");
                },
              },
              {
                text: String(i18n.t("cancel")),
                style: "cancel",
              },
            ]
          );
        }
        return;
      }

      setPdfLoading(true);
      await ensureDecisionTreeCachedForSummary(id, petName);
      await exportSummaryPDF(id);
      await incrementPdfCount();
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportObservationDiaryPDF = async (
    petName: string,
    sessionDate: string | number
  ) => {
    try {
      setPdfTextKey("pdf.generating");
      setPdfLoading(true);
      await exportObservationDiaryPDF(petName, sessionDate);
    } catch (err) {
      console.error("Observation Diary PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportObservationDiaryCSV = async (
    petName: string,
    sessionDate: string | number
  ) => {
    try {
      await exportObservationDiaryCSV(petName, sessionDate);
    } catch (err) {
      console.error("Observation Diary CSV export error:", err);
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
              size={22}
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
              setPendingPdfType("summary");
              setPendingPdfItem(item);
              setPdfLangModalVisible(true);
            }}
            style={styles.iconButton}
          >
            <MaterialIcons name="picture-as-pdf" size={22} color="#E53935" />
          </TouchableOpacity>

          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={async () => {
                const savedPdfLang =
                  (await AsyncStorage.getItem("pdfLanguage")) ||
                  i18n.locale ||
                  "en";

                setCurrentPdfLang(savedPdfLang);
                setPendingPdfType("diary");
                setPendingPdfItem(item);
                setPdfLangModalVisible(true);
              }}
              style={styles.iconButton}
            >
              <MaterialIcons name="description" size={22} color="#42A5F5" />
            </TouchableOpacity>
          )}

          {Platform.OS === "web" && (
            <TouchableOpacity
              onPress={() => {
                setPendingCsvItem(item);
                setCsvModalVisible(true);
              }}
              style={styles.iconButton}
            >
              <MaterialIcons name="insert-drive-file" size={22} color="#43A047" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={styles.iconButton}
          >
            <MaterialIcons name="delete-outline" size={22} color="#999" />
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
      <Text style={styles.toolsHint}>
        {i18n.t("summary.tools_hint", {
          defaultValue:
            "Here you can open a PDF report, use the Observation Diary, or export CSV for follow-up tracking.",
        })}
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
                        if (!pendingPdfItem) return;

                        if (pendingPdfType === "summary") {
                          setPdfTextKey("pdf.preparing_language");
                          await handleExportPDF(
                            pendingPdfItem.id,
                            pendingPdfItem.petName
                          );
                          return;
                        }

                        setPdfTextKey("pdf.generating");
                        await handleExportObservationDiaryPDF(
                          pendingPdfItem.petName,
                          pendingPdfItem.date
                        );
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
                setPendingPdfType(null);
              }}
            >
              <Text style={styles.pdfLangCancelText}>
                {i18n.t("cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={csvModalVisible}
          onDismiss={async () => {
            if (!shouldStartCsvExport || !pendingCsvItem) return;

            try {
              await handleExportObservationDiaryCSV(
                pendingCsvItem.petName,
                pendingCsvItem.date
              );
            } finally {
              setShouldStartCsvExport(false);
              setPendingCsvItem(null);
            }
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.box}>
              <Text style={styles.text}>
                {i18n.t("csv.download_title", { defaultValue: "Download CSV" })}
              </Text>

              <Text style={styles.csvHint}>
                {i18n.t("csv.download_hint", {
                  defaultValue:
                    "This file may not open with standard apps on your phone. Download it to open later in Excel, Google Sheets, or OpenOffice on another device.",
                })}
              </Text>

                <TouchableOpacity
                  style={styles.csvPrimaryButton}
                  onPress={() => {
                    if (!pendingCsvItem) return;

                    setShouldStartCsvExport(true);
                    setCsvModalVisible(false);
                  }}
                >
                  <Text style={styles.csvPrimaryButtonText}>
                    {i18n.t("csv.download_button", { defaultValue: "Download CSV" })}
                  </Text>
                </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfLangCancel}
                onPress={() => {
                  setShouldStartCsvExport(false);
                  setCsvModalVisible(false);
                  setPendingCsvItem(null);
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
      <LoadingPDF visible={pdfLoading} textKey={pdfTextKey} />
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
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
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
    justifyContent: "flex-end",
    flexShrink: 0,
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
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
  csvHint: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
    textAlign: "center",
  },

  csvPrimaryButton: {
    marginTop: 16,
    backgroundColor: "#43A047",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  csvPrimaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  toolsHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    marginBottom: 14,
  },

});
