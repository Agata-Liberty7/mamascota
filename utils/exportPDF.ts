// app/utils/exportPDF.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { chatWithGPT } from "./chatWithGPT";

import { Platform } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { generateObservationDiaryPdf } from "./generateObservationDiaryPdf";
import { generateObservationDiaryCsv } from "./generateObservationDiaryCsv";

function normalizePdfText(input: any): string {
  if (input === null || input === undefined) return "";
  let s = String(input);

  try {
    s = s.normalize("NFC");
  } catch {}

  s = s
    .replace(/\u0138/g, "к")
    .replace(/\u0137/g, "К");

  return s;
}

function buildStaticHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 24px;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }
    h1, h2, h3 {
      margin-top: 20px;
    }
  </style>
</head>
<body>
${content}
</body>
</html>
`;
}

function escapeHtml(text: any): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function openWebPdfPreview(
  html: string,
  title: string,
  previewWindow?: Window | null
) {
  const preview = previewWindow ?? window.open("", "_blank");

  if (!preview) {
    throw new Error("WebPreviewWindowBlocked");
  }

  const escapedTitle = escapeHtml(normalizePdfText(title));

  preview.document.open();
  preview.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
    body {
      margin: 0;
      background: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: flex-end;
      padding: 12px 16px;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      cursor: pointer;
      background: #2f6fed;
      color: #ffffff;
    }

    .toolbar button.secondary {
      background: #6b7280;
    }

    .page {
      max-width: 900px;
      margin: 24px auto;
      background: #ffffff;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    }

    @media print {
      .toolbar {
        display: none;
      }

      .page {
        max-width: none;
        margin: 0;
        box-shadow: none;
      }

      body {
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Print / Save PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>

  <div class="page">${html}</div>
</body>
</html>
  `);
  preview.document.close();
}

function buildOwnerNotesFromChatRaw(chatRaw: string | null): string {
  if (!chatRaw) return "";

  // 1. удаляем служебные маркеры полностью
  const cleaned = chatRaw
    .replace(/__MAMASCOTA_[^_]+__/g, "")
    .replace(/\n{2,}/g, "\n");

  // 2. разбиваем на строки
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 3. берём только фактические наблюдения пользователя
  // (убираем системные/агентные блоки)
  const facts = lines.filter((line) => {
    const lower = line.toLowerCase();

    return (
      !lower.includes("mamascota") &&
      !lower.includes("decision") &&
      !lower.includes("finalize") &&
      !lower.includes("observación") &&
      !lower.includes("plan") &&
      !lower.includes("steps")
    );
  });

  // 4. ограничиваем размер (чтобы не было “простыней”)
  const limited = facts.slice(0, 6);

  // 5. превращаем в буллеты (без интерпретаций)
  return limited.map((l) => `• ${escapeHtml(normalizePdfText(l))}`).join("\n");
}

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

function getDecisionTreeCacheKey(sessionId: string, locale: string) {
  return `pdfDecisionTree:${sessionId}:${locale}`;
}

function getPdfReportCacheKey(sessionId: string, locale: string) {
  return `pdfReport:${sessionId}:${locale}`;
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

async function getCachedPdfReport(
  sessionId: string,
  locale: string,
  currentMessagesCount: number
) {
  try {
    const raw = await AsyncStorage.getItem(getPdfReportCacheKey(sessionId, locale));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedMessagesCount =
      typeof parsed?.messagesCount === "number" ? parsed.messagesCount : -1;

    if (savedMessagesCount !== currentMessagesCount) {
      return null;
    }

    if (
      typeof parsed?.html !== "string" ||
      !parsed.html.trim() ||
      typeof parsed?.title !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedPdfReport(
  sessionId: string,
  locale: string,
  payload: {
    messagesCount: number;
    title: string;
    html: string;
    fileName: string;
  }
) {
  try {
    await AsyncStorage.setItem(
      getPdfReportCacheKey(sessionId, locale),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        locale,
        messagesCount: payload.messagesCount,
        title: payload.title,
        html: payload.html,
        fileName: payload.fileName,
      })
    );
  } catch {}
}

async function getWorkerDecisionTreeFromChatCache(
  sessionId: string,
  locale: string
) {
  try {
    const exactKey = `decisionTree:${sessionId}:${locale}`;
    const exactRaw = await AsyncStorage.getItem(exactKey);

    const parseDecisionTree = (raw: string | null) => {
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const dt = parsed?.decisionTree;

      const isNonEmptyObject =
        dt &&
        typeof dt === "object" &&
        !Array.isArray(dt) &&
        Object.keys(dt).length > 0;

      return isNonEmptyObject ? dt : null;
    };

    const exactDt = parseDecisionTree(exactRaw);
    if (exactDt) return exactDt;

    const keyBase = `decisionTree:${sessionId}:`;
    const keys = await AsyncStorage.getAllKeys();

    const fallbackKey = keys.find((k) => k.startsWith(keyBase));
    if (!fallbackKey) return null;

    const fallbackRaw = await AsyncStorage.getItem(fallbackKey);
    return parseDecisionTree(fallbackRaw);
  } catch {
    return null;
  }
}

function bulletsFromStringArray(value: any): string {
  if (Array.isArray(value)) {
    return value
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .map((s) => `• ${s}`)
      .join("\n");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const lines = trimmed
      .split(/\n|•|-/)
      .map((s) => s.trim())
      .filter(Boolean);

    return lines.map((s) => `• ${s}`).join("\n");
  }

  return "";
}

function normalizeNextSteps(dt: any) {
  const ns = dt?.next_steps ?? dt?.nextSteps ?? {};

  return {
    observe_at_home:
      ns?.observe_at_home ??
      ns?.observeAtHome ??
      ns?.observation_at_home ??
      ns?.home_observation ??
      "",
    urgent_now:
      ns?.urgent_now ??
      ns?.urgentNow ??
      ns?.urgent ??
      "",
    plan_visit:
      ns?.plan_visit ??
      ns?.planVisit ??
      ns?.visit_plan ??
      "",
  };
}

function mapDecisionTreeToPdfSections(dt: any) {
  const ns = normalizeNextSteps(dt);

  return {
    anamnesisShort: bulletsFromStringArray(
      dt?.anamnesis_short ??
        dt?.anamnesisShort ??
        dt?.anamnesis ??
        ""
    ),
    nextSteps: {
      observe_at_home: bulletsFromStringArray(ns?.observe_at_home),
      urgent_now: bulletsFromStringArray(ns?.urgent_now),
      plan_visit: bulletsFromStringArray(ns?.plan_visit),
    },
  };
}

function localizeSpecies(species: string, sex: string, locale?: string): string {
  const s = species?.toLowerCase() || "";
  const sx = sex?.toLowerCase() || "";

  const fullKey = `animal_${s}_${sx}`;
  const baseKey = `animal_${s}`;

  const byFull = i18n.t(fullKey, { locale, defaultValue: "" });
  if (byFull && typeof byFull === "string" && byFull.trim() !== fullKey) {
    return byFull;
  }

  const byBase = i18n.t(baseKey, { locale, defaultValue: "" });
  if (byBase && typeof byBase === "string" && byBase.trim() !== baseKey) {
    return byBase;
  }

  return species;
}

async function getSpeciesImageUri(species: string): Promise<string> {
  const value = (species || "").trim().toLowerCase();

  let moduleRef: Parameters<typeof Asset.fromModule>[0] | null = null;

  if (value === "cat") {
    moduleRef = require("../assets/images/gato.png");
  } else if (value === "dog") {
    moduleRef = require("../assets/images/perro.png");
  } else {
    return "";
  }

  try {
    if (!moduleRef) return "";

    const asset = Asset.fromModule(moduleRef);

    if (Platform.OS === "web") {
      return asset.uri || "";
    }

    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    const fileUri = asset.localUri || asset.uri;
    if (!fileUri) return "";

    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch {
    return "";
  }
}

async function buildDecisionTree(conversationId: string, locale: string) {
  const raw =
    (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) ??
    (await AsyncStorage.getItem(`chat:history:${conversationId}`));

  const chat = raw ? JSON.parse(raw) : [];

  const combined = Array.isArray(chat)
    ? chat
        .map(
          (m: any) =>
            `${String(m?.role || "").toUpperCase()}: ${String(
              m?.content || ""
            )}`
        )
        .join("\n")
    : "";

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
    conversationId: `summary-${conversationId}`,
  });

  const replyText = (res as any)?.reply || "";
  let dt: any = (res as any)?.decisionTree;

  if (!dt && typeof replyText === "string") {
    try {
      const parsed = JSON.parse(replyText);
      dt = parsed?.decisionTree ?? parsed;
    } catch {}
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

async function getDecisionTreeCached(sessionId: string, locale: string) {
  try {
    const workerDt = await getWorkerDecisionTreeFromChatCache(sessionId, locale);
    console.log("DT DEBUG >>>", JSON.stringify(workerDt, null, 2));

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

export async function exportSummaryPDF(
  sessionId: string,
  previewWindow?: Window | null
) {
  try {
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

    const ownerNotesFallback = buildOwnerNotesFromChatRaw(chatRaw);

    const locale =
      (await AsyncStorage.getItem("pdfLanguage")) ||
      i18n.locale ||
      "en";

    const currentMessagesCount = await getChatLengthForSession(sessionId);
    const cachedReport = await getCachedPdfReport(
      sessionId,
      locale,
      currentMessagesCount
    );

    if (cachedReport) {
      if (Platform.OS === "web") {
        openWebPdfPreview(cachedReport.html, cachedReport.title, previewWindow);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: cachedReport.html });
      const newPath = FileSystem.documentDirectory + cachedReport.fileName;

      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      if (Platform.OS === "android") {
        const cUri = await FileSystem.getContentUriAsync(newPath);

        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: cUri,
          flags: 1,
          type: "application/pdf",
        });

        await Sharing.shareAsync(newPath, {
          mimeType: "application/pdf",
          dialogTitle: cachedReport.fileName,
        });
      } else {
        await Sharing.shareAsync(newPath, {
          mimeType: "application/pdf",
          dialogTitle: cachedReport.fileName,
          UTI: "com.adobe.pdf",
        });
      }

      return;
    }

    const dtKey = `decisionTree:${sessionId}:${locale}`;
    const dtRaw = await AsyncStorage.getItem(dtKey);

    if (!dtRaw) {
      alert(
        i18n.t("chat.pdf_not_ready", {
          defaultValue:
            "The consultation is not finished yet. Complete it to generate a report.",
        })
      );
      return;
    }

    const isHebrew = locale.startsWith("he");

    const petName =
      summary.petName ||
      i18n.t("chat.pet_default", { locale, defaultValue: "Pet" });
    const pet = await findPetByName(petName);

    const species =
      localizeSpecies(pet?.species || "", pet?.sex || "", locale) || "";

    const speciesImageUri = await getSpeciesImageUri(pet?.species || "");

    let anamnesisShort = "";
    let nextSteps: any = {};

    try {
      const workerDt = await getWorkerDecisionTreeFromChatCache(sessionId, locale);
      if (workerDt) {
        const mapped = mapDecisionTreeToPdfSections(workerDt);
        anamnesisShort = mapped.anamnesisShort;
        nextSteps = mapped.nextSteps;
      }
    } catch {}

    const symptomKeys: string[] = summary.symptomKeys || [];

    const localizedSymptoms = symptomKeys.map((k) =>
      i18n.t(`symptoms.${k}`, { locale, defaultValue: k })
    );

    const title = i18n.t("pdf.report_title", {
      locale,
      defaultValue: "Consultation Summary",
    });
    const dateLabel = i18n.t("pdf.date_label", {
      locale,
      defaultValue: "Date and time",
    });
    const symptomsTitle = i18n.t("symptomSelector.title", {
      locale,
      defaultValue: "Symptoms",
    });
    const animalDataTitle = i18n.t("animal_data", {
      locale,
      defaultValue: "Animal data",
    });
    const nameLabel = i18n.t("settings.pets.name_label", {
      locale,
      defaultValue: "Name",
    });
    const speciesLabel = i18n.t("settings.pets.species_label", {
      locale,
      defaultValue: "Species",
    });
    const breedLabel = i18n.t("settings.pets.breed_label", {
      locale,
      defaultValue: "Breed",
    });
    const ageLabel = i18n.t("settings.pets.age_label", {
      locale,
      defaultValue: "Age",
    });
    const ownerNotesTitle = i18n.t("pdf.owner_notes_title", {
      locale,
      defaultValue: "Anamnesis (owner’s report)",
    });
    const nextStepsTitle = i18n.t("pdf.next_steps_title", {
      locale,
      defaultValue: "What to do next",
    });
    const observeTitle = i18n.t("pdf.observe_title", {
      locale,
      defaultValue: "What to observe at home",
    });
    const urgentTitle = i18n.t("pdf.urgent_title", {
      locale,
      defaultValue: "Go to the clinic urgently if",
    });
    const planTitle = i18n.t("pdf.plan_title", {
      locale,
      defaultValue: "Planned visit",
    });

    const brandName = "Mamascota";
    const brandUrl = "https://mamascota.com";

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

.header {
  margin-bottom: 14px;
}

.brand {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
  color: #1f1f1f;
  margin-bottom: 10px;
}

.brand-line {
  height: 3px;
  width: 100%;
  background: #2f6fed;
  border-radius: 999px;
  margin-bottom: 18px;
}

h1 {
  font-size: 20px;
  margin-top: 0;
  margin-bottom: 14px;
}

h2 {
  font-size: 16px;
  margin-top: 20px;
  margin-bottom: 8px;
}

h3 {
  font-size: 14px;
  margin-top: 14px;
  margin-bottom: 6px;
}

.row {
  margin-bottom: 4px;
}

.label {
  font-weight: 600;
}

.mono {
  white-space: pre-wrap;
}

.divider {
  border-top: 1px solid #ccc;
  margin: 20px 0;
}

.animal-card {
  display: table;
  width: 100%;
  margin-bottom: 8px;
}

.animal-card-text,
.animal-card-image {
  display: table-cell;
  vertical-align: top;
}

.animal-card-text {
  width: 65%;
  padding-right: 16px;
}

.animal-card-image {
  width: 35%;
  text-align: right;
}

.animal-card-image img {
  max-width: 160px;
  max-height: 160px;
  object-fit: contain;
}

.footer {
  margin-top: 28px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
}

.footer a {
  color: #2f6fed;
  text-decoration: none;
}
</style>
</head>

<body>

<div class="header">
  <div class="brand">${escapeHtml(brandName)}</div>
  <div class="brand-line"></div>
</div>

<h1>${escapeHtml(normalizePdfText(title))}</h1>

<p style="margin-top: 6px; font-size: 13px; color: #444;">
  ${escapeHtml(normalizePdfText(
    i18n.t("pdf.share_hint", {
      locale,
      defaultValue:
        "Send this report to your veterinarian before the visit or bring it with you — it can significantly reduce consultation time.",
    })
  ))}
</p>

<h2>${escapeHtml(normalizePdfText(animalDataTitle))}</h2>

<div class="animal-card">
  <div class="animal-card-text">
    <div class="row"><span class="label">${escapeHtml(
      normalizePdfText(nameLabel)
    )}:</span> ${escapeHtml(normalizePdfText(petName))}</div>

    ${
      species
        ? `<div class="row"><span class="label">${escapeHtml(
            normalizePdfText(speciesLabel)
          )}:</span> ${escapeHtml(normalizePdfText(species))}</div>`
        : ""
    }
    ${
      pet?.breed
        ? `<div class="row"><span class="label">${escapeHtml(
            normalizePdfText(breedLabel)
          )}:</span> ${escapeHtml(
            normalizePdfText(String(pet.breed))
          )}</div>`
        : ""
    }
    ${
      pet?.ageYears != null
        ? `<div class="row"><span class="label">${escapeHtml(
            normalizePdfText(ageLabel)
          )}:</span> ${escapeHtml(
            normalizePdfText(String(pet.ageYears))
          )}</div>`
        : ""
    }
  </div>

  <div class="animal-card-image">
    ${
      speciesImageUri
        ? `<img src="${speciesImageUri}" alt="${escapeHtml(
            normalizePdfText(species || pet?.species || "pet")
          )}" />`
        : ""
    }
  </div>
</div>

<h2>${escapeHtml(normalizePdfText(dateLabel))}</h2>
<div>${new Date(summary.date).toLocaleString(locale)}</div>

<h2>${escapeHtml(normalizePdfText(symptomsTitle))}</h2>
<div>${escapeHtml(normalizePdfText(localizedSymptoms.join(", ") || "—"))}</div>

<div class="divider"></div>

<h2>${escapeHtml(normalizePdfText(ownerNotesTitle))}</h2>
<div class="mono">${escapeHtml(
      normalizePdfText(anamnesisShort || ownerNotesFallback || "—")
    )}</div>

<div class="divider"></div>

<h2>${escapeHtml(normalizePdfText(nextStepsTitle))}</h2>

<h3>${escapeHtml(normalizePdfText(observeTitle))}</h3>
<div class="mono">${escapeHtml(
      normalizePdfText(nextSteps?.observe_at_home || "—")
    )}</div>

<h3>${escapeHtml(normalizePdfText(urgentTitle))}</h3>
<div class="mono">${escapeHtml(
      normalizePdfText(nextSteps?.urgent_now || "—")
    )}</div>

<h3>${escapeHtml(normalizePdfText(planTitle))}</h3>
<div class="mono">${escapeHtml(
      normalizePdfText(nextSteps?.plan_visit || "—")
    )}</div>

<div class="footer">
  <a href="${brandUrl}" target="_blank" rel="noopener noreferrer">${brandUrl}</a>
</div>

</body>
</html>
    `.trim();

    const safePetName = (petName || "pet")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_а-яё]/gi, "");

    const dateObj = new Date(summary.date);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const hh = String(dateObj.getHours()).padStart(2, "0");
    const min = String(dateObj.getMinutes()).padStart(2, "0");

    const fileName = `mamascota_${safePetName}_${yyyy}-${mm}-${dd}_${hh}-${min}.pdf`;

    await saveCachedPdfReport(sessionId, locale, {
      messagesCount: currentMessagesCount,
      title,
      html,
      fileName,
    });

    if (Platform.OS === "web") {
      openWebPdfPreview(html, title, previewWindow);
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });

    const newPath = FileSystem.documentDirectory + fileName;

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    if (Platform.OS === "android") {
      const cUri = await FileSystem.getContentUriAsync(newPath);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: cUri,
        flags: 1,
        type: "application/pdf",
      });

      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
    } else {
      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
        UTI: "com.adobe.pdf",
      });
    }

  } catch (err: any) {
  // do not change app UI language in PDF error flow

    console.error("❌ exportSummaryPDF error:", err);
    alert(
      i18n.t("chat.pdf_error", {
        defaultValue: "Не удалось создать PDF. Попробуйте еще раз.",
      })
    );
  }
}

export async function exportObservationDiaryPDF(
  petName?: string,
  sessionDate?: string | number
) {
  try {
    const locale =
      (await AsyncStorage.getItem("pdfLanguage")) ||
      i18n.locale ||
      "en";

    const pet = petName ? await findPetByName(petName) : null;
    const speciesLabel = pet
      ? localizeSpecies(pet?.species || "", pet?.sex || "", locale) || "—"
      : "—";

    const startDate = sessionDate
      ? new Date(sessionDate).toLocaleDateString(locale)
      : new Date().toLocaleDateString(locale);

    const html = generateObservationDiaryPdf({
      petName:
        petName ||
        i18n.t("chat.pet_default", { locale, defaultValue: "Pet" }),
      speciesLabel,
      startDate,
      locale,
    });

    const safePetName = (petName || "pet")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_а-яё]/gi, "");

    const dateObj = new Date();
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");

    const fileName = `mamascota_diary_${safePetName}_${yyyy}-${mm}-${dd}.pdf`;

    const { uri } = await Print.printToFileAsync({ html });
    const newPath = FileSystem.documentDirectory + fileName;

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    if (Platform.OS === "android") {
      const cUri = await FileSystem.getContentUriAsync(newPath);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: cUri,
        flags: 1,
        type: "application/pdf",
      });

      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
    } else {
      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
        UTI: "com.adobe.pdf",
      });
    }
  } catch (err) {
    console.error("❌ exportObservationDiaryPDF error:", err);
    alert(i18n.t("privacy_paragraph2"));
  }
}

export async function exportObservationDiaryCSV(
  petName?: string,
  sessionDate?: string | number
) {
// no global locale switch here

  try {
    const locale =
      (await AsyncStorage.getItem("pdfLanguage")) ||
      i18n.locale ||
      "en";

    // use locale only in local translation calls

    const pet = petName ? await findPetByName(petName) : null;

    const speciesLabel = pet
      ? localizeSpecies(pet?.species || "", pet?.sex || "", locale) || "—"
      : "—";

    const startDate = sessionDate
      ? new Date(sessionDate).toLocaleDateString(locale)
      : new Date().toLocaleDateString(locale);

    const csv = generateObservationDiaryCsv({
      petName,
      speciesLabel,
      startDate,
    });

    const safePetName = (petName || "pet")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_а-яё]/gi, "");

    const dateObj = new Date();
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");

    const fileName = `mamascota_diary_${safePetName}_${yyyy}-${mm}-${dd}.csv`;

    if (Platform.OS === "web") {
      // fileName already prepared above
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const fileUri =
      FileSystem.documentDirectory +
      `observation-diary-${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (Platform.OS === "android") {
      const cUri = await FileSystem.getContentUriAsync(fileUri);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: cUri,
        flags: 1,
        type: "*/*",
      });
      return;
    }

    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: i18n.t("csv.download_title", {
          locale,
          defaultValue: "CSV file",
        }),
        UTI: "public.comma-separated-values-text",
      });
    } else {
      alert(
        i18n.t("csv.download_title", {
          defaultValue: "CSV file",
        })
      );
    }
  } catch (err) {
    console.error("❌ exportObservationDiaryCSV error:", err);
    alert(i18n.t("privacy_paragraph2"));
 
  }
}