/**
 * agent-sdk-test.mjs
 * Быстрая проверка доступа к Agent SDK OpenAI
 */

import OpenAI from "openai";

// 1️⃣ Загружаем API-ключ из .env
import dotenv from "dotenv";
dotenv.config();

// 2️⃣ Проверяем наличие ключа
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Не найден OPENAI_API_KEY в .env");
  process.exit(1);
}

// 3️⃣ Инициализация клиента
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAgentSDK() {
  try {
    console.log("🚀 Проверка SDK-доступа...");

    // 4️⃣ Минимальный запрос через Responses API (SDK-вызов)
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: "Привет! Это тест подключения к Agent SDK.",
    });

    console.log("✅ Ответ от модели:");
    console.log(response.output_text);
  } catch (error) {
    console.error("✖ Ошибка при обращении к SDK:");
    console.error(error);
  }
}

testAgentSDK();
