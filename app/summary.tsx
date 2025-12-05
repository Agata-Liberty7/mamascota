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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { restoreSession } from "../utils/chatWithGPT";
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

export default function SummaryScreen() {
  const [sessions, setSessions] = useState<SummaryItem[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
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
  const handleExportPDF = async (id: string) => {
    try {
      setPdfLoading(true); // ← показать модалку
      await exportSummaryPDF(id);
    } catch (err) {
      Alert.alert(t("menu.summary", "History"), "PDF export failed.");
    } finally {
      setPdfLoading(false); // ← скрыть модалку
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
            onPress={() => handleExportPDF(item.id)}
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
        {t("menu.summary", "Consultation history")}
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

});
