// ============================================
// 🧠 mamascota-agent.mjs — стабильная версия
// ============================================

import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { buildAgentContext } from "./utils/buildAgentContext.mjs";

dotenv.config();

// --------------------------------------------
// 🐾 normalizePet (без зависимости от фронта)
// --------------------------------------------
function normalizePet(p) {
  return {
    id: p?.id || null,
    name: p?.name || "Sin nombre",
    species: p?.species || "No especificada",
    sex: p?.sex || "No indicado",
    ageYears: p?.ageYears || null,
    neutered: !!p?.neutered,
  };
}

// --------------------------------------------
// 🤖 OPENAI
// --------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------
// 📘 Системный промт
// --------------------------------------------
const PROMPT_PATH = path.resolve("./profiles/mamascota-familiar.md");
let SYSTEM_PROMPT = "";

try {
  SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, "utf8");
  console.log(`✅ [PROMPT] Загружен (${SYSTEM_PROMPT.length} символов)`);
} catch (err) {
  console.error("❌ [PROMPT] Ошибка загрузки:", err.message);
}

// ============================================
// 🧠 Главная функция — processMessage
// ============================================
export async function processMessage(
  message,
  pet,
  symptomKeys = [],
  userLang = "en",
  conversationId = "default",
  conversationHistory = [],
  langOverride = "en"
) {
  console.log("💬 Новое сообщение:", message);
  console.log("🐾 Питомец:", pet);
  console.log("🧵 ID диалога:", conversationId);

  try {
    const petData = normalizePet(pet);

    // 🔤 Выбираем рабочий язык ответов
    const effectiveLang = langOverride || userLang || "es";

    // Подставляем язык в плейсхолдер {LANG_OVERRIDE} из mamascota-familiar.md
    const finalSystemPrompt = SYSTEM_PROMPT.replace(
      /\{LANG_OVERRIDE\}/g,
      effectiveLang
    );

    // ----------------------------------------------------------
    // 🔥 Логика "реального" первого шага диалога
    // ----------------------------------------------------------
    const isFirstRealMessage =
      symptomKeys?.length > 0 || // пользователь выбрал симптомы
      conversationHistory.length === 0 ||
      (conversationHistory.length === 1 &&
        conversationHistory[0]?.content === ""); // техническое пустое сообщение

    let fullContext = "";

    if (isFirstRealMessage) {
      console.log("🟢 Первый шаг диалога → строим полный контекст…");

      fullContext = await buildAgentContext(
        petData,
        symptomKeys,
        userLang,
        "familiar"
      );

      console.log("🧩 Контекст сформирован:", fullContext ? "OK" : "EMPTY");
    } else {
      console.log("🔁 Контекст уже был, пропускаем загрузку YAML");
    }

    // ----------------------------------------------------------
    // 🧪 Защищённый JSON.parse
    // ----------------------------------------------------------
    let parsedContext = null;
    if (fullContext) {
      try {
        parsedContext = JSON.parse(fullContext);
      } catch (err) {
        console.warn("⚠️ Ошибка JSON.parse(fullContext):", err);
      }
    }

    // ----------------------------------------------------------
    // 🩺 Краткое резюме пациента
    // ----------------------------------------------------------
    let petSummary = "";
    if (parsedContext?.pet) {
      const p = parsedContext.pet;
      petSummary = `
Данные пациента:
- Имя: ${p.name || "не указано"}
- Вид: ${p.species || "не указан"}
- Возраст: ${p.ageYears ?? "нет данных"} лет
- Стерилизован: ${p.neutered ? "да" : "нет"}
      `;
    }

    // ----------------------------------------------------------
    // 🧠 Формирование истории сообщений для GPT
    // ----------------------------------------------------------
    const messages = [];

    // 1) SYSTEM — твой большой промпт + служебная пометка
    messages.push({
      role: "system",
      content:
        `${finalSystemPrompt}\n\n` +
        `[LANG_OVERRIDE]: ${effectiveLang}\n` +
        `[Инструкция]: Отвечай кратко, ясно, строго по шагам и без диагнозов.`,
    });

    // 2) Guard-промпт по языку (дополнительная защита)
    messages.push({
      role: "user",
      content: `Отвечай только на языке: ${effectiveLang}. Никогда не переходи на другой язык.`,
    });

    // 3) Контекст алгоритмов (JSON из buildAgentContext), если это первый шаг
    if (fullContext) {
      messages.push({
        role: "user",
        content: fullContext,
      });
    }

    // 4) История диалога
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // 5) Текущее сообщение пользователя (без дублирования)
    if (!conversationHistory.some((m) => m.content === message)) {
      messages.push({
        role: "user",
        content: message,
      });
    }

    // ----------------------------------------------------------
    // 🤖 GPT ответ
    // ----------------------------------------------------------
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.5,
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "Извини, не удалось получить ответ.";

    console.log("✅ Ответ агента:", reply);

    return { ok: true, reply, conversationId };
  } catch (error) {
    console.error("❌ Ошибка processMessage:", error);
    return {
      ok: false,
      error: "Ошибка при обработке сообщения.",
      details: String(error.message || error),
    };
  }
}

