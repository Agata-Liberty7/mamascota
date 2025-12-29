// utils/chatWithGPT.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { showExitConfirmation } from "./showExitConfirmation";
import { getLocalizedSpeciesLabel } from "./getLocalizedSpeciesLabel";


// Тип ответа, который ожидает чат и другие вызовы
export type ChatResult = { ok: boolean; reply?: string; error?: string };

// Универсальный URL агента: сначала берём точный /agent, иначе — из API_URL
const AGENT_URL =
  process.env.EXPO_PUBLIC_PROXY_URL ||
  (process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/agent`
    : "");

  
/**
 * Каноничный метод получения активного питомца.
 * Использует только новую модель: pets:list + pets:activeId.
 */
async function getUnifiedActivePet(): Promise<any | null> {
  try {
    const [listRaw, activeId] = await Promise.all([
      AsyncStorage.getItem("pets:list"),
      AsyncStorage.getItem("pets:activeId"),
    ]);

    if (!listRaw || !activeId) return null;

    const list = JSON.parse(listRaw);
    if (!Array.isArray(list) || list.length === 0) return null;

    return list.find((p: any) => p.id === activeId) ?? null;
  } catch (e) {
    console.warn("⚠️ Ошибка чтения pets:list:", e);
    return null;
  }
}

// --------------------------------------------------
// 📤 Вызов агента
// --------------------------------------------------
export async function chatWithGPT(params: {
  message: string;
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
  conversationId?: string; // можно явно задать (например, summary-…)
}): Promise<ChatResult> {
  const { message, pet, symptomKeys, userLang, conversationId } = params || {};

  if (!AGENT_URL) {
    console.error(
      "❌ AGENT_URL не задан. Проверь .env (EXPO_PUBLIC_PROXY_URL / EXPO_PUBLIC_API_URL)."
    );
    return { ok: false, error: "Не настроен адрес прокси-агента" };
  }

  // 🐾 если pet не пришёл — берём из единой модели
  // 🐾 если pet не пришёл — берём из единой модели
const ensuredPet = pet ?? (await getUnifiedActivePet());

// 🐾 добавляем готовую локализованную подпись вида
const petWithLabel = ensuredPet
  ? {
      ...ensuredPet,
      speciesLabel: getLocalizedSpeciesLabel(
        ensuredPet.species,
        ensuredPet.sex
      ),
    }
  : undefined;

  // Явно переданный conversationId (например summary-…)
  const explicitConversationId = conversationId ?? null;

  // Спец-флаг: это “служебный” диалог для PDF, его нельзя мешать с основным
  const isSummaryConversation =
    typeof explicitConversationId === "string" &&
    explicitConversationId.startsWith("summary-");

  try {
    const existingId = await AsyncStorage.getItem("conversationId");
    const storedLang = await AsyncStorage.getItem("selectedLanguage");
    const effectiveLang = userLang || storedLang || "en";

    // Если нам явно передали conversationId (например summary-…),
    // используем его; иначе — обычный сохранённый id
    const effectiveConversationId =
      explicitConversationId || existingId || undefined;

    // ✅ гарантируем id для обычного чата
    const ensuredConversationId =
      isSummaryConversation
        ? effectiveConversationId
        : (effectiveConversationId ?? `conv-${Date.now()}`);

    if (!isSummaryConversation && !effectiveConversationId) {
      await setConversationId(ensuredConversationId!);
    }


    // 🧠 Хвост истории (20 сообщений) — только для обычного диалога, НЕ для summary
    const conversationHistory = isSummaryConversation
      ? []
      : await getConversationHistoryTail(effectiveConversationId, 20);


    
    const body = {
      message: message ?? "",
      pet: petWithLabel ?? undefined,
      symptomKeys: symptomKeys ?? undefined,
      userLang: effectiveLang,
      conversationId: ensuredConversationId,
      conversationHistory,
    };

    // Отладка входных параметров
    console.log("🐾 Питомец из параметров:", safeLogPet(body.pet));
    console.log(
      "🗝️ symptomKeys:",
      Array.isArray(body.symptomKeys) ? body.symptomKeys : []
    );
    console.log("🗣️ userLang:", body.userLang || "(не задан)");
    console.log("💬 conversationId (→ сервер):", body.conversationId);
    console.log(
      "🧠 conversationHistory tail:",
      Array.isArray(body.conversationHistory) ? body.conversationHistory.length : 0
    );
    console.log("[CHAT] AGENT_URL =", AGENT_URL);
    console.log("[CHAT] payload.pet =", body?.pet);

    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      console.error("❌ Не удалось распарсить JSON ответа агента:", e);
      return { ok: false, error: "Неверный формат ответа агента" };
    }

    // Итоговый id диалога, который вернулся с сервера
    const serverConversationId =
      (typeof data?.conversationId === "string" &&
        data.conversationId.trim()) ||
      undefined;

    // Для обычного (НЕ summary) диалога:
    // 1) обновляем conversationId в AsyncStorage
    // 2) сохраняем историю чата
    if (res.ok && data?.ok) {
      if (typeof data.reply === "string") {
        const targetConversationId =
          serverConversationId || effectiveConversationId;

        if (targetConversationId && !isSummaryConversation) {
          await setConversationId(targetConversationId);

          try {
            const prev =
              (await AsyncStorage.getItem(
                `chatHistory:${targetConversationId}`
              )) || "[]";
            const chatHistory = JSON.parse(prev);

            const userMsg = message?.trim()
              ? { role: "user", content: message.trim() }
              : null;
            const assistantMsg = { role: "assistant", content: data.reply };

            const updated = [
              ...chatHistory,
              ...(userMsg ? [userMsg] : []),
              assistantMsg,
            ];

            await AsyncStorage.setItem(
              `chatHistory:${targetConversationId}`,
              JSON.stringify(updated)
            );

            // дублируем в новый ключ (на будущее)
            try {
              await AsyncStorage.setItem(
                `chat:history:${targetConversationId}`,
                JSON.stringify(updated)
              );
            } catch (err) {
              console.warn(
                "⚠️ Не удалось сохранить историю в chat:history:",
                err
              );
            }

            console.log(
              "💾 История чата сохранена:",
              updated.length,
              "сообщений (id:",
              targetConversationId,
              ")"
            );
          } catch (err) {
            console.warn("⚠️ Не удалось сохранить историю чата:", err);
          }
        } else if (isSummaryConversation) {
          console.log(
            "ℹ️ Summary-конверсация, историю и conversationId не трогаем."
          );
        }

        return { ok: true, reply: data.reply ?? "" };
      }

      return { ok: false, error: "Неверный формат поля reply" };
    }

    const errMsg =
      typeof data?.error === "string"
        ? data.error
        : `Ошибка агента (HTTP ${res.status})`;
    console.error("❌ Ошибка при обращении к агенту:", errMsg);
    return { ok: false, error: errMsg };
  } catch (err) {
    console.error("❌ Сбой при вызове агента:", err);
    return { ok: false, error: "Ошибка соединения с агентом" };
  }
}

function safeLogPet(pet: any) {
  if (!pet || typeof pet !== "object") return pet;
  const { id, name, species, sex, ageYears, neutered } = pet as any;
  return { id, name, species, sex, ageYears, neutered };
}

// --------------------------------------------------
// 🧠 History: хвост последних N сообщений для модели
// --------------------------------------------------
async function getConversationHistoryTail(
  conversationId?: string,
  limit = 20
): Promise<Array<{ role: "user" | "assistant" | "system"; content: string }>> {
  if (!conversationId) return [];

  // Пробуем сначала основной ключ, потом дубль
  const keyA = `chatHistory:${conversationId}`;
  const keyB = `chat:history:${conversationId}`;

  try {
    const raw =
      (await AsyncStorage.getItem(keyA)) ||
      (await AsyncStorage.getItem(keyB)) ||
      "[]";

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const cleaned = parsed
      .filter((m: any) => m && typeof m === "object")
      .map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "",
      }))
      .filter(
        (m: any) =>
          (m.role === "user" || m.role === "assistant") &&
          m.content.trim().length > 0
      );

    // хвост N сообщений
    return cleaned.slice(-limit);
  } catch (e) {
    console.warn("⚠️ Не удалось прочитать историю для conversationHistory:", e);
    return [];
  }
}

// --------------------------------------------------
// 💾 Работа с conversationId
// --------------------------------------------------
export async function clearConversationId(): Promise<void> {
  await AsyncStorage.removeItem("conversationId");
  console.log("🧹 conversationId удалён.");
}

export async function setConversationId(id: string): Promise<void> {
  await AsyncStorage.setItem("conversationId", id);
  console.log("💬 Установлен conversationId:", id);
}

export async function getConversationId(): Promise<string | null> {
  return AsyncStorage.getItem("conversationId");
}

// ==================================================
// 💬 Выход: сохранить / удалить / отменить
// ==================================================
export async function handleExitAction(
  petName?: string,
  lastUserMessage?: string
): Promise<void> {
  const id = await getConversationId();

  if (!id) {
    console.log(
      "ℹ️ Нет активной сессии — выходим на главный экран без подтверждения."
    );

    try {
      router.replace("/");
      console.log("↩️ Возврат на главный экран (без активной сессии)");
    } catch (err) {
      console.warn("⚠️ Не удалось выполнить возврат на главный экран:", err);
    }

    return;
  }

  const choice = await showExitConfirmation();
  console.log("📤 Выбор при выходе:", choice);

  if (choice === "save") {
    const activePet = await getUnifiedActivePet();
    console.log("🐾 Активный питомец при сохранении:", activePet?.name);

    const symptomsRaw =
      (await AsyncStorage.getItem("selectedSymptoms")) ??
      (await AsyncStorage.getItem("symptomKeys")) ??
      (await AsyncStorage.getItem("symptoms"));
    const symptomKeys: string[] = symptomsRaw ? JSON.parse(symptomsRaw) : [];

    const record = {
      id,
      date: new Date().toISOString(),
      petName: activePet?.name?.trim() || "Без имени",
      context: (lastUserMessage || "").slice(0, 120) || "Без описания",
      symptomKeys,
    };

    try {
      const stored = (await AsyncStorage.getItem("chatSummary")) || "[]";
      const parsed = JSON.parse(stored);
      const filtered = parsed.filter((rec: any) => rec.id !== id);
      filtered.unshift(record);
      await AsyncStorage.setItem("chatSummary", JSON.stringify(filtered));
      console.log("💾 Обновлена запись в Summary:", record);

      await AsyncStorage.setItem("lastChatSessionExists", "1");
      console.log("✅ lastChatSessionExists установлен в '1'");
    } catch (e) {
      console.error("❌ Не удалось сохранить chatSummary:", e);
    }
  }

  if (choice === "delete") {
    await clearConversationId();
    console.log("🗑️ Сессия удалена, при следующем сообщении начнётся новая.");
  }

  if (choice === "cancel") {
    console.log(
      "🚫 Действие отменено пользователем, остаёмся на текущем экране."
    );
    return;
  }

  try {
    router.replace("/");
    console.log("↩️ Возврат на главный экран после выхода");
  } catch (err) {
    console.warn("⚠️ Не удалось выполнить возврат на главный экран:", err);
  }
}

// --------------------------------------------------
// ♻️ Восстановление сохранённой сессии (по выбору из Summary)
// --------------------------------------------------
export async function restoreSession(id: string): Promise<void> {
  await setConversationId(id);
  console.log("♻️ Восстановлена сессия с ID:", id);
}
