// utils/handleActiveSessionDecision.ts
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";

export type ActiveSessionDecision = "resume" | "start_new" | "cancel" | "no_active";

function isInternalCommand(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const t = text.trim();
  return t === "__MAMASCOTA_FINALIZE__" || t === "__MAMASCOTA_DECISION_TREE__";
}

async function hasNonEmptyHistory(conversationId: string): Promise<boolean> {
  const keyA = `chatHistory:${conversationId}`;
  const keyB = `chat:history:${conversationId}`;

  const raw =
    (await AsyncStorage.getItem(keyA)) ??
    (await AsyncStorage.getItem(keyB)) ??
    null;

  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;

    return parsed.some((m: any) => {
      const role = m?.role;
      const content = typeof m?.content === "string" ? m.content.trim() : "";
      if (role !== "user" && role !== "assistant") return false;
      if (!content) return false;
      if (isInternalCommand(content)) return false;
      return true;
    });
  } catch {
    return false;
  }
}

/**
 * Единый алерт выбора при наличии активной сессии.
 * "Мягко": ничего не удаляет — только возвращает решение.
 */
export async function handleActiveSessionDecision(): Promise<ActiveSessionDecision> {
  let cid = await AsyncStorage.getItem("conversationId");

  if (!cid) {
    try {
      const summaryRaw = await AsyncStorage.getItem("chatSummary");
      const parsed = summaryRaw ? JSON.parse(summaryRaw) : [];
      const latest = Array.isArray(parsed) ? parsed[0] : null;
      const fallbackId =
        latest?.id || latest?.conversationId || null;

      if (typeof fallbackId === "string" && fallbackId.trim()) {
        cid = fallbackId.trim();
        await AsyncStorage.setItem("conversationId", cid);
      }
    } catch {}
  }

  if (!cid) return "no_active";

  const ok = await hasNonEmptyHistory(cid);
  if (!ok) return "no_active";

  return await new Promise<ActiveSessionDecision>((resolve) => {
    Alert.alert(
      String(i18n.t("continue_title")),
      String(i18n.t("continue_message")),
      [
        {
          text: String(i18n.t("continue_session")),
          onPress: () => resolve("resume"),
        },
        {
          text: String(i18n.t("start_new")),
          style: "destructive",
          onPress: () => resolve("start_new"),
        },
        {
          text: String(i18n.t("cancel")),
          style: "cancel",
          onPress: () => resolve("cancel"),
        },
      ],
      { cancelable: true }
    );
  });
}