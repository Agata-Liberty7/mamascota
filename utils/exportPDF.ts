// app/utils/exportPDF.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { chatWithGPT } from "./chatWithGPT";



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
  // 1) достаём историю чата
  const raw = await AsyncStorage.getItem(`chatHistory:${conversationId}`);
  const chat = raw ? JSON.parse(raw) : [];

  const combined = Array.isArray(chat)
    ? chat
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n")
    : "";

  const request = `
  Проанализируй ветеринарную консультацию ниже и верни СТРОГО JSON без пояснений:

  {
    "anamnesis_short": ["..."],
    "focus_for_vet": ["..."],
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
  - 3–5 пунктов максимум в "focus_for_vet".
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
  `;


  const res = await chatWithGPT({
    message: request,
    userLang: locale,
    // служебная беседа, не смешиваем с основным чатом
    conversationId: `summary-${conversationId}`,
  });

  const replyText = res?.reply || "";

  let anamnesisShort = "";
  let focusForVet = "";
  let nextObserve = "";
  let nextUrgent = "";
  let nextPlan = "";

  try {
    const parsed = JSON.parse(replyText);

    const a = Array.isArray(parsed?.anamnesis_short) ? parsed.anamnesis_short : [];
    const f = Array.isArray(parsed?.focus_for_vet) ? parsed.focus_for_vet : [];
    const ns = parsed?.next_steps || {};

    const o = Array.isArray(ns?.observe_at_home) ? ns.observe_at_home : [];
    const u = Array.isArray(ns?.urgent_now) ? ns.urgent_now : [];
    const p = Array.isArray(ns?.plan_visit) ? ns.plan_visit : [];

    // Форматируем в читабельные буллеты
    const bullets = (arr: any[]) =>
      arr
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .map((s) => `• ${s}`)
        .join("\n");

    anamnesisShort = bullets(a);
    focusForVet = bullets(f);
    nextObserve = bullets(o);
    nextUrgent = bullets(u);
    nextPlan = bullets(p);
  } catch (err) {
    console.warn("⚠️ Не удалось распарсить JSON summary, fallback:", err);
  }

  return {
    anamnesisShort,
    focusForVet,
    nextSteps: {
      observe_at_home: nextObserve,
      urgent_now: nextUrgent,
      plan_visit: nextPlan,
    },
  };

}


//
// -----------------------------------------------------
// Основная функция экспорта PDF
// -----------------------------------------------------
export async function exportSummaryPDF(sessionId: string) {
  try {
    //
    // 1) читаем Summary и историю
    //
    //
    // 1) читаем Summary и историю
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


    const locale = i18n.locale || "en";
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
    // 3) Анамнез и клиническое обоснование из кастома
    //
    const { anamnesisShort, focusForVet, nextSteps } = await buildDecisionTree(sessionId, locale);

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
    const title = i18n.t("menu.summary", { defaultValue: "Summary" });
    const dateLabel = i18n.t("pdf.date_label", { defaultValue: "Date and time" });
    const symptomsTitle = i18n.t("symptomSelector.title", {
      defaultValue: "Symptoms",
    });

    const animalDataTitle = i18n.t("animal_data", {
      defaultValue: "Animal data",
    });
    const nameLabel = i18n.t("settings.pets.name_label", {
      defaultValue: "Name",
    });
    const speciesLabel = i18n.t("settings.pets.species_label", {
      defaultValue: "Species",
    });
    const breedLabel = i18n.t("settings.pets.breed_label", {
      defaultValue: "Breed",
    });
    const ageLabel = i18n.t("settings.pets.age_label", {
      defaultValue: "Age",
    });

    const ownerNotesTitle = i18n.t("pdf.owner_notes_title", {
      defaultValue: "Anamnesis (owner’s report)",
    });

    const focusTitle = i18n.t("pdf.focus_title", {
      defaultValue: "What the vet should check",
    });

    const nextStepsTitle = i18n.t("pdf.next_steps_title", {
      defaultValue: "What to do next",
    });

    const observeTitle = i18n.t("pdf.observe_title", {
      defaultValue: "What to observe at home",
    });

    const urgentTitle = i18n.t("pdf.urgent_title", {
      defaultValue: "Go to the clinic urgently if",
    });

    const planTitle = i18n.t("pdf.plan_title", {
      defaultValue: "Planned visit",
    });



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

<h2>${escapeHtml(normalizePdfText(focusTitle))}</h2>
<div class="mono">${escapeHtml(normalizePdfText(focusForVet || "—"))}</div>

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

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: title,
    });
  } catch (err: any) {
    console.error("❌ exportSummaryPDF error:", err);
    alert(i18n.t("privacy_paragraph2"));
  }
}
