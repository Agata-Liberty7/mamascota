// utils/chatWithGPT.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { showExitConfirmation } from "./showExitConfirmation";
import { getLocalizedSpeciesLabel } from "./getLocalizedSpeciesLabel";

// Тип ответа, который ожидает чат и другие вызовы
export type ChatResult = {
  ok: boolean;
  reply?: string;
  error?: string;
  conversationId?: string;
  sessionEnded?: boolean;
  needsFinalize?: boolean;
  phase?: "intake" | "clarify" | "summary" | "ended";
  decisionTree?: any | null;
};

// Универсальный URL агента: сначала берём точный /agent, иначе — из API_URL
const AGENT_URL =
  process.env.EXPO_PUBLIC_PROXY_URL ||
  (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}` : "");

// ✅ Optional fallback endpoint (2nd provider / non-Cloudflare)
const FALLBACK_AGENT_URL: string | null =
  process.env.EXPO_PUBLIC_FALLBACK_PROXY_URL?.trim() || null;

const AGENT_WARM_AT_KEY = "agent:warmAt";
const AGENT_WARM_TTL_MS = 10 * 60 * 1000; // 10 минут


// --------------------------------------------------
// 🗄️ Endpoint cache (AsyncStorage)
// --------------------------------------------------
const AGENT_CACHE_KEY = "agent:workingUrl";
const AGENT_CACHE_AT_KEY = "agent:workingUrlSavedAt";
// TTL кэша — 6 часов
const AGENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;


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

async function getSelectedSymptomKeysFromStorage(): Promise<string[]> {
  try {
    const raw =
      (await AsyncStorage.getItem("selectedSymptoms")) ??
      (await AsyncStorage.getItem("symptomKeys")) ??
      (await AsyncStorage.getItem("symptoms")) ??
      null;

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((x) => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    console.warn("⚠️ Ошибка чтения выбранных симптомов:", e);
    return [];
  }
}

// --------------------------------------------------
// 📤 Вызов агента
// --------------------------------------------------
export async function chatWithGPT(params: {
  message: string;
  internalCommand?: "__MAMASCOTA_FINALIZE__" | "__MAMASCOTA_DECISION_TREE__";
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
  conversationId?: string; // можно явно задать (например, summary-…)
  conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>; 
  // ✅ NEW
}): Promise<ChatResult> {
  const { message, internalCommand, pet, symptomKeys, userLang, conversationId } = params || {};

  if (!AGENT_URL) {
    console.error(
      "❌ AGENT_URL не задан. Проверь .env (EXPO_PUBLIC_PROXY_URL / EXPO_PUBLIC_API_URL)."
    );
    return { ok: false, error: "Не настроен адрес прокси-агента" };
  }

  // 🐾 если pet не пришёл — берём из единой модели
  const ensuredPet = pet ?? (await getUnifiedActivePet());

  // 🗝️ если symptomKeys не передали — берём из AsyncStorage (чтобы не терялись между сообщениями)
  const ensuredSymptomKeys =
    Array.isArray(symptomKeys) && symptomKeys.length > 0
      ? symptomKeys
      : await getSelectedSymptomKeysFromStorage();

  // 🐾 добавляем готовую локализованную подпись вида
  const petWithLabel = ensuredPet
    ? {
        ...ensuredPet,
        speciesLabel: getLocalizedSpeciesLabel(ensuredPet.species, ensuredPet.sex),
      }
    : undefined;

  // Явно переданный conversationId (например summary-…)
  const explicitConversationId = conversationId ?? null;

  // Спец-флаг: это “служебный” диалог для PDF, его нельзя мешать с основным
  const isSummaryConversation =
    typeof explicitConversationId === "string" &&
    explicitConversationId.startsWith("summary-");

  // если пришла служебная команда — она имеет приоритет над message
  const effectiveInternalCommand =
    typeof internalCommand === "string" && internalCommand.trim()
      ? internalCommand.trim()
      : "";

  // реальное сообщение для воркера
  const effectiveMessage = effectiveInternalCommand || (message ?? "");

  // Служебный запрос для PDF: worker должен видеть историю,
  // но мы НЕ должны сохранять это как часть диалога
  const isDecisionTreeRequest =
    effectiveInternalCommand === "__MAMASCOTA_DECISION_TREE__";

  const isFinalizeRequest =
    effectiveInternalCommand === "__MAMASCOTA_FINALIZE__";

  try {
    const existingId = await AsyncStorage.getItem("conversationId");
    const storedLang = await AsyncStorage.getItem("selectedLanguage");
    const effectiveLang = userLang || storedLang || "en";

    // Если нам явно передали conversationId (например summary-…),
    // используем его; иначе — обычный сохранённый id
    const effectiveConversationId =
      explicitConversationId || existingId || undefined;

    // ✅ гарантируем id для обычного чата
    const ensuredConversationId = isSummaryConversation
      ? effectiveConversationId
      : effectiveConversationId ?? `conv-${Date.now()}`;

    if (!isSummaryConversation && !effectiveConversationId) {
      await setConversationId(ensuredConversationId!);
    }

    // 🧠 Хвост истории — только для обычного диалога, НЕ для summary
    // 🧠 History:
    // 1) если историю передали явно (например, из chat.tsx ensureDecisionTreeCached) — используем её
    // 2) если это decisionTree-команда — worker ДОЛЖЕН видеть историю даже для summary-…
    // 3) обычный summary-диалог (не decisionTree) — как раньше: без истории
    const conversationHistory =
      Array.isArray(params?.conversationHistory) && params.conversationHistory.length > 0
        ? params.conversationHistory
        : isDecisionTreeRequest
          ? await getConversationHistoryTail(ensuredConversationId, 80)
          : isSummaryConversation
            ? []
            : await getConversationHistoryTail(ensuredConversationId, 80);

    const body = {
      message: effectiveMessage,
      internalCommand: effectiveInternalCommand || undefined,
      pet: petWithLabel ?? undefined,
      symptomKeys: ensuredSymptomKeys,
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

    // --------------------------------------------------
    // 🌐 Choose endpoint: cached → primary → fallback
    // --------------------------------------------------
    let workingUrl = AGENT_URL;

    // 1) пробуем кэш
    const cached = await readCachedWorkingUrl();
    if (cached) {
      workingUrl = cached;
      console.log("[CHAT] workingUrl (cached) =", workingUrl);
    } else {
      // PERF: без лишнего GET /health — сразу пробуем POST на primary,
      // failover уже реализован в postAgentWithFailover
      workingUrl = AGENT_URL;

      // кэшируем primary как стартовую точку
      await writeCachedWorkingUrl(workingUrl);
    }


    // ✅ POST with retry + (optional) fallback
    const res = await postAgentWithFailover(workingUrl, FALLBACK_AGENT_URL, body);
    // если endpoint отвечает — обновим кэш
    await writeCachedWorkingUrl(workingUrl);

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      console.error("❌ Не удалось распарсить JSON ответа агента:", e);
      return { ok: false, error: "Неверный формат ответа агента" };
    }

    // Итоговый id диалога, который вернулся с сервера
    const serverConversationId =
      (typeof data?.conversationId === "string" && data.conversationId.trim()) ||
      undefined;

    if (res.ok && data?.ok) {
      if (typeof data.reply === "string") {
        // ✅ сохраняем строго по ensuredConversationId, чтобы не терять историю
        const targetConversationId = serverConversationId || ensuredConversationId;

        if (targetConversationId && !isSummaryConversation && !isDecisionTreeRequest) {
          await setConversationId(targetConversationId);

          try {
            const prev =
              (await AsyncStorage.getItem(`chatHistory:${targetConversationId}`)) ||
              "[]";
            const chatHistory = JSON.parse(prev);

            const userMsg =
              !effectiveInternalCommand && effectiveMessage.trim()
                ? { role: "user", content: effectiveMessage.trim() }
                : null;

            // ✅ ACK needsFinalize может приходить с пустым reply — его нельзя сохранять как сообщение ассистента
            const needsFinalize = !!data?.needsFinalize;
            function sanitizeAssistantText(text: string) {
              return text.replace(/\b[a-z]+_[a-z_]+\b/g, "").replace(/\s{2,}/g, " ").trim();
            }

            const assistantText =
              typeof data.reply === "string" ? sanitizeAssistantText(data.reply) : "";
              
            const assistantMsg =
              !needsFinalize && assistantText.trim().length > 0
                ? { role: "assistant", content: assistantText }
                : null;

            const updated = [
              ...chatHistory,
              ...(userMsg ? [userMsg] : []),
              ...(assistantMsg ? [assistantMsg] : []),
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
              console.warn("⚠️ Не удалось сохранить историю в chat:history:", err);
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
          console.log("ℹ️ Summary-конверсация, историю и conversationId не трогаем.");
        }

        const phase =
          data?.phase === "intake" ||
          data?.phase === "clarify" ||
          data?.phase === "summary" ||
          data?.phase === "ended"
            ? data.phase
            : undefined;

        // ✅ decisionTree payload (из воркера) — сохраняем только для обычного чата
        if (data?.decisionTree && serverConversationId && !isSummaryConversation) {
          try {
            const dtKey = `decisionTree:${serverConversationId}:${effectiveLang}`;
            await AsyncStorage.setItem(
              dtKey,
              JSON.stringify({
                createdAt: new Date().toISOString(),
                decisionTree: data.decisionTree,
              })
            );
            console.log("💾 decisionTree сохранён:", dtKey);
          } catch (e) {
            console.warn("⚠️ Не удалось сохранить decisionTree:", e);
          }
        }

        return {
          ok: true,
          reply: data.reply ?? "",
          conversationId: serverConversationId || ensuredConversationId,
          sessionEnded: !!data?.sessionEnded,
          needsFinalize: !!data?.needsFinalize,
          phase,
          decisionTree: data?.decisionTree ?? null,
        };
      }

      return { ok: false, error: "Неверный формат поля reply" };
    }

    const errMsg =
      typeof data?.error === "string"
        ? data.error
        : `Ошибка агента (HTTP ${res.status})`;
    console.error("❌ Ошибка при обращении к агенту:", errMsg);
    return { ok: false, error: errMsg };
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    const isAbort =
      msg.includes("AbortError") || msg.includes("aborted") || msg.includes("Aborted");

    console.error("❌ Сбой при вызове агента:", msg);
    try {
      await AsyncStorage.removeItem(AGENT_CACHE_KEY);
      await AsyncStorage.removeItem(AGENT_CACHE_AT_KEY);
    } catch {}

    return {
      ok: false,
      error: isAbort
        ? "Агент не успел ответить вовремя (таймаут соединения). Попробуйте ещё раз."
        : "Ошибка соединения с агентом",
    };
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
  limit = 80
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
    console.log("ℹ️ Нет активной сессии — выходим на главный экран без подтверждения.");

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

    } catch (e) {
      console.error("❌ Не удалось сохранить chatSummary:", e);
    }

    try {
      router.replace("/summary");
      console.log("↩️ Переход в Summary после сохранения");
    } catch (err) {
      console.warn("⚠️ Не удалось перейти в Summary:", err);
    }
    return;
  }

  if (choice === "delete") {
    await clearConversationId();
    console.log("🗑️ Сессия удалена, при следующем сообщении начнётся новая.");
  }

  if (choice === "cancel") {
    console.log("🚫 Действие отменено пользователем, остаёмся на текущем экране.");
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

// --------------------------------------------------
// 🌐 Network helpers: timeout + health URL
// --------------------------------------------------
function toHealthUrl(agentUrl: string): string {
  if (/\/agent\/?$/.test(agentUrl)) {
    return agentUrl.replace(/\/agent\/?$/, "/health");
  }
  return agentUrl.replace(/\/$/, "") + "/health";
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function probeHealth(url: string): Promise<boolean> {
  try {
    const healthUrl = toHealthUrl(url);
    const r = await fetchWithTimeout(healthUrl, { method: "GET" }, 4000);
    return r.ok;
  } catch {
    return false;
  }
}
async function readCachedWorkingUrl(): Promise<string | null> {
  try {
    const [url, at] = await Promise.all([
      AsyncStorage.getItem(AGENT_CACHE_KEY),
      AsyncStorage.getItem(AGENT_CACHE_AT_KEY),
    ]);

    if (!url || !at) return null;

    const savedAt = Number(at);
    if (!Number.isFinite(savedAt)) return null;

    const age = Date.now() - savedAt;
    if (age > AGENT_CACHE_TTL_MS) return null;

    return url;
  } catch {
    return null;
  }
}

async function writeCachedWorkingUrl(url: string): Promise<void> {
  if (!url) return;
  try {
    await Promise.all([
      AsyncStorage.setItem(AGENT_CACHE_KEY, url),
      AsyncStorage.setItem(AGENT_CACHE_AT_KEY, String(Date.now())),
    ]);
  } catch {
    // кэш не критичен — молча игнорируем
  }
}

export async function warmUpAgentInBackground(): Promise<void> {
  if (!AGENT_URL) return;

  try {
    const raw = await AsyncStorage.getItem(AGENT_WARM_AT_KEY);
    const last = raw ? Number(raw) : 0;
    const idleTooLong = !last || Date.now() - last > AGENT_WARM_TTL_MS;
    if (!idleTooLong) return;

    // 1) берём тот же workingUrl, что и чат: cached → primary → fallback
    let warmUrl = (await readCachedWorkingUrl()) || AGENT_URL;

    // если кэша нет — пробуем health
    if (!warmUrl) warmUrl = AGENT_URL;

    const primaryOk = await probeHealth(AGENT_URL);
    if (primaryOk) {
      warmUrl = AGENT_URL;
    } else if (FALLBACK_AGENT_URL) {
      const fallbackOk = await probeHealth(FALLBACK_AGENT_URL);
      if (fallbackOk) warmUrl = FALLBACK_AGENT_URL;
    }

    // 2) сохраняем найденный workingUrl, чтобы следующий чат быстрее стартовал
    await writeCachedWorkingUrl(warmUrl);

    const healthUrl = toHealthUrl(warmUrl);

    // 3) Греем /health (быстро)
    void fetchWithTimeout(healthUrl, { method: "GET" }, 20000)
      .then((r) => console.log("🔥 warm-up /health status:", r.status))
      .catch((e) => console.warn("🔥 warm-up /health failed:", String(e)));

    // 4) Греем именно /agent (лёгким POST), чтобы прогреть то, что реально отваливается
    const warmBody = {
      message: "",
      userLang: (await AsyncStorage.getItem("selectedLanguage")) || "en",
      conversationId: `warm-${Date.now()}`,
      conversationHistory: [],
      warmup: true,
    };

    void fetchWithTimeout(
      warmUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warmBody),
      },
      20000
    )
      .then((r) => console.log("🔥 warm-up /agent status:", r.status))
      .catch((e) => console.warn("🔥 warm-up /agent failed:", String(e)))
      .finally(async () => {
        // фиксируем warmAt ПОСЛЕ попытки, чтобы не “замораживать” прогрев на 10 минут, если он реально не случился
        try {
          await AsyncStorage.setItem(AGENT_WARM_AT_KEY, String(Date.now()));
        } catch {}
      });
  } catch (e) {
    console.warn("🔥 warm-up error:", String(e));
  }
}

async function postAgentWithFailover(
  primaryUrl: string,
  fallbackUrl: string | null,
  body: any
): Promise<Response> {
  const doPost = async (url: string, timeoutMs: number) => {
    const t0 = Date.now();
    console.log("⏳ doPost timeoutMs =", timeoutMs, "url =", url);
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs
    );
    console.log(`⏱️ POST /agent took ${Date.now() - t0} ms (timeout ${timeoutMs})`);
    return res;
  };

  // 1) первая попытка — 45с  (обычно отвечает за 5–15с, но иногда может затянуться)
  try {
    return await doPost(primaryUrl, 45000);
  } catch (e) {
    console.warn("⚠️ POST failed (primary #1):", String(e));
  }

  // 2) retry — 60с (можем дать чуть больше времени, если первый раз не ответил)
  try {
    return await doPost(primaryUrl, 60000);
  } catch (e) {
    console.warn("⚠️ POST failed (primary #2):", String(e));
  }

  // 3) fallback — 60с (если задан и отличается от primary)
  if (fallbackUrl && fallbackUrl !== primaryUrl) {
    try {
      console.warn("🛟 Switching to fallback for POST...");
      return await doPost(fallbackUrl, 60000);
    } catch (e) {
      console.warn("⚠️ POST failed (fallback):", String(e));
    }
  }

  throw new Error("POST /agent failed");
}
