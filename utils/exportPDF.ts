// app/utils/exportPDF.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { chatWithGPT } from "./chatWithGPT";

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
Проанализируй ветеринарную консультацию ниже и верни СТРОГО JSON без пояснений с такой структурой:

{
  "anamnesis": {
    "observations": "Кратко и по делу, что владелец наблюдает (симптомы, длительность, динамика, контекст). Без диагнозов.",
    "clarifications": "Уточняющие вопросы и ответы владельца, которые помогают прояснить картину. Без диагнозов."
  },
  "reasoning": {
    "excluded": "Какие варианты по признакам выглядят менее вероятными или уже исключены (без названий болезней, только описательно).",
    "directions": "Важные направления, на которые стоит обратить внимание (например, боль, ЖКТ, поведение, возможное инородное тело и т.п.), без заболеваний.",
    "actions": "Что владелец может сделать с этой информацией: продолжать наблюдение, на что обращать внимание, когда стоит идти в клинику и зачем. Без списков анализов и протоколов."
  }
}

Требования:
- Пиши строго на языке пользователя: ${locale}.
- Не добавляй ничего ДО или ПОСЛЕ JSON.
- Не используй названия заболеваний и диагнозов.
- Не перечисляй конкретные анализы, исследования или протоколы.
- Если информации мало, заполни, чем можешь, но не выдумывай факты, которых нет в диалоге.

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

  let anamnesis = "";
  let reasoning = "";

  try {
    const parsed = JSON.parse(replyText);

    const a = parsed?.anamnesis || {};
    const r = parsed?.reasoning || {};

    const obs = typeof a.observations === "string" ? a.observations.trim() : "";
    const clar = typeof a.clarifications === "string" ? a.clarifications.trim() : "";

    const excl = typeof r.excluded === "string" ? r.excluded.trim() : "";
    const dirs = typeof r.directions === "string" ? r.directions.trim() : "";
    const acts = typeof r.actions === "string" ? r.actions.trim() : "";

    anamnesis = [obs, clar].filter(Boolean).join("\n\n");
    reasoning = [excl, dirs, acts].filter(Boolean).join("\n\n");
  } catch (err) {
    console.warn("⚠️ Не удалось распарсить JSON decisionTree, используем весь текст как reasoning:", err);
    // если вдруг JSON не распарсился — всё кладём в reasoning
    anamnesis = "";
    reasoning = replyText;
  }

  return { anamnesis, reasoning };
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
    const { anamnesis, reasoning } = await buildDecisionTree(sessionId, locale);

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
    const ageLabel = i18n.t("settings.pets.age_label", {
      defaultValue: "Age",
    });

    const ownerNotesTitle = i18n.t("pdf.owner_notes_title", {
      defaultValue: "Anamnesis (owner’s report)",
    });

    const decisionTreeTitle = i18n.t("pdf.decision_tree_title", {
      defaultValue: "Clinical reasoning (decision tree)",
    });


    //
    // 7) HTML
    //
    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isHebrew ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>

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

<h1>${escapeHtml(title)}</h1>

<h2>${escapeHtml(animalDataTitle)}</h2>
<div class="row"><span class="label">${escapeHtml(nameLabel)}:</span> ${escapeHtml(petName)}</div>

${
  species
    ? `<div class="row"><span class="label">${escapeHtml(
        speciesLabel
      )}:</span> ${escapeHtml(species)}</div>`
    : ""
}

${
  pet?.ageYears != null
    ? `<div class="row"><span class="label">${escapeHtml(
        ageLabel
      )}:</span> ${escapeHtml(String(pet.ageYears))}</div>`
    : ""
}

<h2>${escapeHtml(dateLabel)}</h2>
<div>${new Date(summary.date).toLocaleString(locale)}</div>

<h2>${escapeHtml(symptomsTitle)}</h2>
<div>${escapeHtml(localizedSymptoms.join(", ") || "—")}</div>

<div class="divider"></div>

<h2>${escapeHtml(ownerNotesTitle)}</h2>
<div class="mono">${escapeHtml(anamnesis || ownerNotesFallback || "—")}</div>

<div class="divider"></div>

<h2>${escapeHtml(decisionTreeTitle)}</h2>
<div class="mono">${escapeHtml(reasoning || "—")}</div>


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
