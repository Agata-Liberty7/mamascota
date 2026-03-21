// app/utils/exportPDF.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { chatWithGPT } from "./chatWithGPT";

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

function normalizePdfText(input: any): string {
  if (input === null || input === undefined) return "";
  let s = String(input);

  // 1) нормализация юникода
  try { s = s.normalize("NFC"); } catch {}

  // 2) замена “похожих” латинских символов на кириллицу (минимальный набор под твой кейс)
  s = s
    .replace(/\u0138/g, "к") // ĸ -> к
    .replace(/\u0137/g, "К"); // Ķ -> К (на всякий)

  return s;
}

//
// -----------------------------------------------------
// HTML-SAFE
// -----------------------------------------------------
function escapeHtml(text: any): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
//
// -----------------------------------------------------
// Собираем "отметки владельца" из истории чата
// -----------------------------------------------------
function buildOwnerNotesFromChatRaw(chatRaw: string | null): string {
  if (!chatRaw) return "";

  try {
    const chat = JSON.parse(chatRaw);
    if (!Array.isArray(chat)) return "";

    const userMessages = chat
      .filter((m: any) => m && m.role === "user")
      .map((m: any) =>
        typeof m.content === "string" ? m.content.trim() : ""
      )
      .filter((s: string) => s.length > 0);

    if (!userMessages.length) return "";

    // чтобы не было много страниц текста — ограничим количество реплик
    const MAX_MESSAGES = 8;
    return userMessages.slice(0, MAX_MESSAGES).join("\n\n");
  } catch {
    return "";
  }
}

//
// -----------------------------------------------------
// Ищем питомца по имени (из pets:list)
// -----------------------------------------------------
async function findPetByName(name: string | null) {
  if (!name) return null;

  try {
    const raw = await AsyncStorage.getItem("pets:list");
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;

    return list.find((p: any) => p.name === name) || null;
  } catch {
    return null;
  }
}
  // -----------------------------------------------------
  // Cache helpers: decisionTree (summary) per session + locale
  // -----------------------------------------------------
  function getDecisionTreeCacheKey(sessionId: string, locale: string) {
    return `pdfDecisionTree:${sessionId}:${locale}`;
  }

  async function getChatLengthForSession(sessionId: string): Promise<number> {
    try {
      const raw =
        (await AsyncStorage.getItem(`chatHistory:${sessionId}`)) ??
        (await AsyncStorage.getItem(`chat:history:${sessionId}`));

      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  // -----------------------------------------------------
  // Read decisionTree cached by ChatScreen (worker-driven)
  // Key format matches app/chat.tsx: decisionTree:${conversationId}:${locale}
  // -----------------------------------------------------
  async function getWorkerDecisionTreeFromChatCache(sessionId: string, locale: string) {
    try {
      const key = `decisionTree:${sessionId}:${locale}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const dt = parsed?.decisionTree;

      const isNonEmptyObject =
        dt &&
        typeof dt === "object" &&
        !Array.isArray(dt) &&
        Object.keys(dt).length > 0;

      return isNonEmptyObject ? dt : null;
    } catch {
      return null;
    }
  }

  function bulletsFromStringArray(arr: any): string {
    return Array.isArray(arr)
      ? arr
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter(Boolean)
          .map((s) => `• ${s}`)
          .join("\n")
      : "";
  }

  function normalizeNextSteps(dt: any) {
    // поддерживаем обе схемы: next_steps (snake) и nextSteps (camel)
    return dt?.next_steps ?? dt?.nextSteps ?? {};
  }

  function mapDecisionTreeToPdfSections(dt: any) {
    const ns = normalizeNextSteps(dt);

    return {
      anamnesisShort: bulletsFromStringArray(dt?.anamnesis_short ?? dt?.anamnesisShort ?? []),
      nextSteps: {
        observe_at_home: bulletsFromStringArray(ns?.observe_at_home ?? ns?.observeAtHome ?? []),
        urgent_now: bulletsFromStringArray(ns?.urgent_now ?? ns?.urgentNow ?? []),
        plan_visit: bulletsFromStringArray(ns?.plan_visit ?? ns?.planVisit ?? []),
      },
    };
  }
  //
  // -----------------------------------------------------
  // Локализуем вид животного (species + sex → локали)
  // -----------------------------------------------------
  function localizeSpecies(species: string, sex: string): string {
    const s = species?.toLowerCase() || "";
    const sx = sex?.toLowerCase() || "";

    const fullKey = `animal_${s}_${sx}`;     // animal_cat_female
    const baseKey = `animal_${s}`;           // animal_cat

    const byFull = i18n.t(fullKey, { defaultValue: "" });
    if (byFull && typeof byFull === "string" && byFull.trim() !== fullKey)
      return byFull;

    const byBase = i18n.t(baseKey, { defaultValue: "" });
    if (byBase && typeof byBase === "string" && byBase.trim() !== baseKey)
      return byBase;

    return species; // fallback
  }

//
// -----------------------------------------------------
// Формируем структурированный анамнез через кастом
// -----------------------------------------------------
async function buildDecisionTree(conversationId: string, locale: string) {
  // 1) достаём историю чата (ВАЖНО: оба ключа)
  const raw =
    (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) ??
    (await AsyncStorage.getItem(`chat:history:${conversationId}`));
  
  const chat = raw ? JSON.parse(raw) : [];

  const combined = Array.isArray(chat)
    ? chat
        .map(
          (m: any) =>
            `${String(m?.role || "").toUpperCase()}: ${String(m?.content || "")}`
        )
        .join("\n")
    : "";

  // 2) запрос (старый надёжный способ: вернуть строго JSON в reply)
  const request = `
Проанализируй ветеринарную консультацию ниже и верни СТРОГО JSON без пояснений:

{
  "anamnesis_short": ["..."],
  "next_steps": {
    "observe_at_home": ["..."],
    "urgent_now": ["..."],
    "plan_visit": ["..."]
  }
}

Требования:
- Язык строго: ${locale}.
- Ничего ДО или ПОСЛЕ JSON.
- 3–6 пунктов максимум в "anamnesis_short".
- В "next_steps":
  - observe_at_home: 1–3 коротких пункта
  - urgent_now: 3–6 чётких признаков
  - plan_visit: 1–2 пункта (зачем очно), без протоколов
- Не использовать слова: "диагноз", "патология", "эндокринный", "метаболический".
- Не писать "менее вероятно", "исключено" и подобное.
- Не перечислять конкретные анализы, исследования, протоколы.
- Не выдумывать факты: только из диалога.
- Учитывай ВСЮ сессию целиком, включая последние сообщения.

=== СЕССИЯ ===
${combined}
`.trim();

  const res = await chatWithGPT({
    message: request,
    userLang: locale,
    // служебная беседа, не смешиваем с основным чатом
    conversationId: `summary-${conversationId}`,
  });

  const replyText = (res as any)?.reply || "";

  // 3) Универсально достаём структуру:
  //    - если воркер вернул decisionTree полем
  //    - иначе парсим JSON из reply (старое поведение)
  let dt: any = (res as any)?.decisionTree;

  if (!dt && typeof replyText === "string") {
    try {
      const parsed = JSON.parse(replyText);
      dt = parsed?.decisionTree ?? parsed;
    } catch {
      // ignore
    }
  }

  const bullets = (arr: any) =>
    Array.isArray(arr)
      ? arr
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter(Boolean)
          .map((s) => `• ${s}`)
          .join("\n")
      : "";

  if (!dt || typeof dt !== "object") {
    // пусть выше сработает fallback ownerNotesFallback, а не пустые секции
    throw new Error("DecisionTreeMissing");
  }

  const ns = dt?.next_steps ?? {};

  return {
    anamnesisShort: bullets(dt?.anamnesis_short ?? []),
    nextSteps: {
      observe_at_home: bullets(ns?.observe_at_home ?? []),
      urgent_now: bullets(ns?.urgent_now ?? []),
      plan_visit: bullets(ns?.plan_visit ?? []),
    },
  };
}

// -----------------------------------------------------
// Cached decisionTree (invalidate when chat grows)
// -----------------------------------------------------
async function getDecisionTreeCached(sessionId: string, locale: string) {
  try {
    const workerDt = await getWorkerDecisionTreeFromChatCache(sessionId, locale);

    if (!workerDt) {
      return null;
    }

    const mapped = mapDecisionTreeToPdfSections(workerDt);

    return {
      anamnesisShort: mapped.anamnesisShort,
      nextSteps: mapped.nextSteps,
    };
  } catch {
    return null;
  }
}

//
// -----------------------------------------------------
// Основная функция экспорта PDF
// -----------------------------------------------------
export async function exportSummaryPDF(sessionId: string) {
  try {
    //
    // 1) читаем Summary и историю чата
    //
    const chatRaw =
      (await AsyncStorage.getItem(`chatHistory:${sessionId}`)) ??
      (await AsyncStorage.getItem(`chat:history:${sessionId}`));

    const summaryRaw = await AsyncStorage.getItem("chatSummary");


    if (!chatRaw || !summaryRaw) {
      alert(i18n.t("settings.clear_done_message"));
      return;
    }

    const allSummaries = JSON.parse(summaryRaw);
    const summary = allSummaries.find((s: any) => s.id === sessionId);

    if (!summary) {
      alert(i18n.t("settings.clear_done_message"));
      return;
    }

    // 📝 Анамнез: сначала пробуем взять из кастома (buildDecisionTree),
    // fallback — собрать заметки владельца напрямую из чата
    const ownerNotesFallback = buildOwnerNotesFromChatRaw(chatRaw);


    const locale =
      (await AsyncStorage.getItem("pdfLanguage")) ||
      i18n.locale ||
      "en";

    const previousLocale = i18n.locale;
    i18n.locale = locale;

    const isHebrew = locale.startsWith("he");

    //
    // 2) данные питомца
    //
    const petName = summary.petName || i18n.t("chat.pet_default");
    const pet = await findPetByName(petName);

    const species =
      localizeSpecies(pet?.species || "", pet?.sex || "") || "";

    //
    // 3) АНамнез: дерево reasoning из кастома
    //
    let anamnesisShort = "";
    let nextSteps: any = {};

    try {
      const workerDt = await getWorkerDecisionTreeFromChatCache(sessionId, locale);
      if (workerDt) {
        const mapped = mapDecisionTreeToPdfSections(workerDt);
        anamnesisShort = mapped.anamnesisShort;
        nextSteps = mapped.nextSteps;
      }
    } catch {
      // decisionTree не обязателен — используем ownerNotesFallback ниже
    }
    //
    // 4) симптоматика
    //
    const symptomKeys: string[] = summary.symptomKeys || [];

    const localizedSymptoms = symptomKeys.map((k) =>
      i18n.t(`symptoms.${k}`, { defaultValue: k })
    );

    //
    //
    // 5) описание владельца
    // (ownerNotes уже собран выше из истории чата / summary.context)


    //
    // 6) локали UI
    //
    const title = i18n.t("pdf.report_title", { defaultValue: "Consultation Summary" });
    const dateLabel = i18n.t("pdf.date_label", { defaultValue: "Date and time" });
    const symptomsTitle = i18n.t("symptomSelector.title", { defaultValue: "Symptoms"});
    const animalDataTitle = i18n.t("animal_data", { defaultValue: "Animal data"});
    const nameLabel = i18n.t("settings.pets.name_label", { defaultValue: "Name"});
    const speciesLabel = i18n.t("settings.pets.species_label", { defaultValue: "Species"});
    const breedLabel = i18n.t("settings.pets.breed_label", { defaultValue: "Breed"});
    const ageLabel = i18n.t("settings.pets.age_label", { defaultValue: "Age"});
    const ownerNotesTitle = i18n.t("pdf.owner_notes_title", { defaultValue: "Anamnesis (owner’s report)"});
    const nextStepsTitle = i18n.t("pdf.next_steps_title", { defaultValue: "What to do next"});
    const observeTitle = i18n.t("pdf.observe_title", { defaultValue: "What to observe at home"});
    const urgentTitle = i18n.t("pdf.urgent_title", { defaultValue: "Go to the clinic urgently if"});
    const planTitle = i18n.t("pdf.plan_title", { defaultValue: "Planned visit"});


    //
    // 7) HTML
    //
    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isHebrew ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(normalizePdfText(title))}</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif;
  color: #222;
  padding: 32px;
  line-height: 1.55;
  font-size: 14px;
}

h1 { font-size: 20px; margin-bottom: 16px; }
h2 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
h3 { font-size: 14px; margin-top: 14px; margin-bottom: 6px; }

.row { margin-bottom: 4px; }
.label { font-weight: 600; }
.mono { white-space: pre-wrap; }

.divider {
  border-top: 1px solid #ccc;
  margin: 20px 0;
}
</style>
</head>

<body>

<h1>${escapeHtml(normalizePdfText(title))}</h1>

<h2>${escapeHtml(normalizePdfText(animalDataTitle))}</h2>
<div class="row"><span class="label">${escapeHtml(normalizePdfText(nameLabel))}:</span> ${escapeHtml(normalizePdfText(petName))}</div>

${
  species
    ? `<div class="row"><span class="label">${escapeHtml(normalizePdfText(
        speciesLabel
      ))}:</span> ${escapeHtml(normalizePdfText(species))}</div>`
    : ""
}
${
  pet?.breed
    ? `<div class="row"><span class="label">${escapeHtml(normalizePdfText(
        breedLabel
      ))}:</span> ${escapeHtml(normalizePdfText(String(pet.breed)))}</div>`
    : ""
}
${
  pet?.ageYears != null
    ? `<div class="row"><span class="label">${escapeHtml(normalizePdfText(
        ageLabel
      ))}:</span> ${escapeHtml(normalizePdfText(String(pet.ageYears)))}</div>`
    : ""
}

<h2>${escapeHtml(normalizePdfText(dateLabel))}</h2>
<div>${new Date(summary.date).toLocaleString(locale)}</div>

<h2>${escapeHtml(normalizePdfText(symptomsTitle))}</h2>
<div>${escapeHtml(normalizePdfText(localizedSymptoms.join(", ") || "—"))}</div>

<div class="divider"></div>

<h2>${escapeHtml(normalizePdfText(ownerNotesTitle))}</h2>
<div class="mono">${escapeHtml(normalizePdfText(anamnesisShort || ownerNotesFallback || "—"))}</div>

<div class="divider"></div>

<h2>${escapeHtml(normalizePdfText(nextStepsTitle))}</h2>

<h3>${escapeHtml(normalizePdfText(observeTitle))}</h3>
<div class="mono">${escapeHtml(normalizePdfText(nextSteps?.observe_at_home || "—"))}</div>

<h3>${escapeHtml(normalizePdfText(urgentTitle))}</h3>
<div class="mono">${escapeHtml(normalizePdfText(nextSteps?.urgent_now || "—"))}</div>

<h3>${escapeHtml(normalizePdfText(planTitle))}</h3>
<div class="mono">${escapeHtml(normalizePdfText(nextSteps?.plan_visit || "—"))}</div>


</body>
</html>
    `.trim();

    //
    // 8) Экспорт PDF
    //
    const { uri } = await Print.printToFileAsync({ html });

    if (Platform.OS === "android") {
      // 1) Открыть PDF во viewer
      const cUri = await FileSystem.getContentUriAsync(uri); // content:// :contentReference[oaicite:3]{index=3}

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: cUri,
        flags: 1,
        type: "application/pdf",
      }); // промис резолвится при возврате в приложение :contentReference[oaicite:4]{index=4}

      // 2) После просмотра — системное меню (сохранить/переслать/печать…)
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: title,
      });
    } else {
      // iOS: сразу системное меню Share (самый стабильный путь в Expo)
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: title,
        UTI: "com.adobe.pdf",
      });
    }

    i18n.locale = previousLocale;

  } catch (err: any) {
    try {
      const fallbackLocale =
        (await AsyncStorage.getItem("selectedLanguage")) || "en";
      i18n.locale = fallbackLocale;
    } catch {}

    console.error("❌ exportSummaryPDF error:", err);
    alert(i18n.t("privacy_paragraph2"));
  }
}
