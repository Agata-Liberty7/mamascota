// ===============================
//  🌐 SERVER.MJS — ЧИСТАЯ ВЕРСИЯ
// ===============================

// ES module utils
import path from "path";
import { fileURLToPath } from "url";

// Node
import os from "os";

// Express stack
import express from "express";
import cors from "cors";

// Dotenv (важно — грузим .env вручную!)
import dotenv from "dotenv";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// Mamascota logic
import { processMessage } from "./mamascota-agent.mjs";
import { loadKnowledgeBase } from "./utils/knowledgeBase-loader.mjs";

// ===============================
//  🚀 EXPRESS И КОНФИГУРАЦИЯ
// ===============================

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ===============================
//  🧠 ТЕСТ ЗАГРУЗКИ YAML ПРИ СТАРТЕ
// ===============================
(async () => {
  try {
    console.log("🧠 Тест: пробую загрузить YAML при старте прокси...");
    const kb = await loadKnowledgeBase();
    console.log("✅ YAML загружен, алгоритмов:", kb?.length || 0);
  } catch (err) {
    console.error("❌ Ошибка загрузки YAML:", err);
  }
})();

// ===============================
//  💬 ПАМЯТЬ ДИАЛОГОВ
// ===============================
const conversationMemory = {}; 
// { conversationId: [ {role, content}, ... ] }

// ===============================
//  📩 ENDPOINT: /agent
// ===============================
app.post("/agent", async (req, res) => {
  try {
    const { message = "", pet = {}, symptomKeys = [], userLang } = req.body || {};

    if (!pet?.species) {
      return res.status(400).json({ ok: false, error: "NO_PET_DATA" });
    }

    const lang = userLang || pet?.lang || process.env.DEFAULT_LANG || "en";
    // 🌐 LANG OVERRIDE — принудительная смена языка агента в текущей сессии
    const langOverride = userLang || "en";


    const conversationId = req.body.conversationId || Date.now().toString();

    if (!conversationMemory[conversationId]) {
      conversationMemory[conversationId] = [];
    }

    conversationMemory[conversationId].push({ role: "user", content: message });

    const reply = await processMessage(
      message,
      pet,
      symptomKeys,
      lang,              // старое поведение не трогаем
      conversationId,
      conversationMemory[conversationId],
      langOverride       // добавляем override
    );


    if (reply?.reply) {
      conversationMemory[conversationId].push({
        role: "assistant",
        content: reply.reply,
      });
    }

    res.json(reply);
  } catch (err) {
    console.error("❌ Ошибка сервера /agent:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ===============================
//  🌐 LOCAL IP DETECT
// ===============================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}

// ===============================
//  🚀 START SERVER
// ===============================
const PORT = process.env.PORT || 3001;
const localIP = getLocalIP();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n==================================`);
  console.log(`✅ Прокси запущен`);
  console.log(`🌍 Local:        http://${localIP}:${PORT}`);
  console.log(`🌐 LAN/0.0.0.0:  http://0.0.0.0:${PORT}`);
  console.log(`==================================\n`);
});

export default app;
