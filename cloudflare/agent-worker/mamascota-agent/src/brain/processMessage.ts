// cloudflare/agent-worker/mamascota-agent/src/brain/processMessage.ts

import { SYSTEM_PROMPT } from "./systemPrompt";
import { buildAgentContext } from "./buildAgentContext";

/**
 * Архитектура (Variant B):
 * - Обычный чат НЕ считает decisionTree автоматически на финале (это тормозит и отваливается).
 * - decisionTree считается ТОЛЬКО по спец-команде "__MAMASCOTA_DECISION_TREE__" (on-demand, по кнопке PDF).
 * - Первый ответ делаем “лёгким”: не грузим тяжелый KB/YAML контекст.
 */

export type BrainResult = {
  ok: boolean;
  reply?: string;
  error?: string;
  conversationId?: string;
  sessionEnded?: boolean;
  phase?: "intake" | "clarify" | "summary" | "ended";
  decisionTree?: {
    anamnesis_short: string[];
    focus_for_vet: string[];
    next_steps: {
      observe_at_home: string[];
      urgent_now: string[];
      plan_visit: string[];
    };
  } | null;
};

type BrainArgs = {
  env: any;
  message: string;
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
  conversationId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  langOverride?: string;
};

// =====================
// Helpers (pure)
// =====================
const END_MARK = "[SESSION_ENDED]";
const DECISION_TREE_CMD = "__MAMASCOTA_DECISION_TREE__";

const PROMPT_VERSION = "2026-02-21-perf-first-light";

/**
 * Light system prompt for the very first assistant message:
 * - shorter => faster first token
 * - no KB/YAML
 * - still enforces: feminine voice, 1 question, no diagnosis/meds, urgent if red flags
 */
function buildFirstStepSystemPrompt(lang: string) {
  return [
    `PROMPT_VERSION=${PROMPT_VERSION}`,
    `You are Mamascota (female voice). You help a pet owner prepare for a vet visit. You do NOT diagnose.`,
    `Language must be exactly: "${lang}".`,
    `Rules:`,
    `- Ask EXACTLY ONE clear question per message.`,
    `- No checklists and no long explanations.`,
    `- No diagnoses, no medications, no treatment plans.`,
    `- If urgent red flags are present, stop asking questions and tell the owner to seek urgent care now.`,
    `First message goal: acknowledge symptoms were selected in the app, then ask ONE question about timeline/changes (when started, worsening/improving).`,
  ].join("\n");
}

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeSymptomKeys(symptomKeys: any): string[] {
  if (!Array.isArray(symptomKeys)) return [];
  return symptomKeys
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

// proxy-compatible normalizePet (matches mamascota-agent.mjs)
// normalizePet: сохраняем КЛЮЧИ из приложения, без текстовых заглушек
function normalizePet(p: any) {
  const name = typeof p?.name === "string" && p.name.trim() ? p.name.trim() : null;

  const species =
    typeof p?.species === "string" && p.species.trim() ? p.species.trim() : null; // "dog" | "cat" | ...

  const sexRaw = typeof p?.sex === "string" ? p.sex.trim() : "";
  const sex = sexRaw === "male" || sexRaw === "female" ? sexRaw : null;

  const breedRaw = typeof p?.breed === "string" ? p.breed.trim() : "";
  const breed = breedRaw ? breedRaw : null; // "__other" сохраняем как есть

  const ageYears = typeof p?.ageYears === "number" ? p.ageYears : null;

  return {
    id: p?.id ?? null,
    name,
    species,
    breed,
    sex,
    ageYears,
    neutered: !!p?.neutered,
  };
}

function pickModel(env: any): string {
  const clean = (v: any) => String(v ?? "").trim().replace(/\s+/g, "");
  const override = clean(env?.MAMASCOTA_MODEL_OVERRIDE);
  const base = clean(env?.OPENAI_MODEL);
  const chosen = override || base || "gpt-5-mini";

  console.log("[MODEL] OPENAI_MODEL=", JSON.stringify(env?.OPENAI_MODEL));
  console.log("[MODEL] MAMASCOTA_MODEL_OVERRIDE=", JSON.stringify(env?.MAMASCOTA_MODEL_OVERRIDE));
  console.log("[MODEL] chosen=", chosen);

  return chosen;
}

function hasAnyRealTurns(history: Array<{ role: string; content: string }>) {
  return (history || []).some(
    (m) =>
      (m?.role === "user" || m?.role === "assistant") &&
      typeof m?.content === "string" &&
      m.content.trim().length > 0
  );
}

function detectPhase(cleanedReply: string, sessionEnded: boolean, isFirstRealMessage: boolean) {
  if (sessionEnded) return "ended" as const;
  if (isFirstRealMessage) return "intake" as const;

  const text = (cleanedReply || "").trim();
  if (/[?¿]/.test(text)) return "clarify" as const;
  return "intake" as const;
}

async function callOpenAIChat(args: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}): Promise<string> {
  console.log("[OPENAI] calling chat.completions", {
    model: args.model,
    messagesCount: args.messages?.length ?? 0,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
    }),
  });

  console.log("[OPENAI] status", res.status);

  const data: any = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data?.error?.message && String(data.error.message)) ||
      `OpenAI error HTTP ${res.status}`;
    throw new Error(msg);
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Invalid OpenAI reply format");
  }

  return reply;
}

// =====================
// decisionTree (worker-side)
// =====================
function safeArrayOfStrings(x: any): string[] {
  return Array.isArray(x)
    ? x.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
    : [];
}

function buildDecisionTreeRequestV2(locale: string, combined: string) {
  return `
Проанализируй ветеринарный диалог ниже и верни СТРОГО JSON без пояснений:

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
- Не выдумывать факты: только из диалога.
- Пункты должны быть практичными и конкретными (без “воды”).

Лимиты:
- anamnesis_short: 3–6 пунктов
- focus_for_vet: 3–5 пунктов
- observe_at_home: 2–5 пунктов (без лечения)
- urgent_now: 3–6 чётких признаков срочности
- plan_visit: 1–2 пункта (зачем очно)

Границы:
• не ставь диагнозы;
• не назначай лечение или препараты;
• не интерпретируй результаты анализов;
• не делай клинических выводов.

=== СЕССИЯ ===
${combined}
`.trim();
}

async function buildDecisionTreeInWorker(args: {
  apiKey: string;
  model: string;
  locale: string;
  sessionMessages: Array<{ role: string; content: string }>;
}): Promise<BrainResult["decisionTree"]> {
  const combined = args.sessionMessages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
    .join("\n");

  const request = buildDecisionTreeRequestV2(args.locale, combined);

  const replyText = await callOpenAIChat({
    apiKey: args.apiKey,
    model: args.model,
    messages: [
      { role: "system", content: "Верни строго валидный JSON. Никакого текста до или после JSON." },
      { role: "user", content: request },
    ],
  });

  try {
    const parsed = JSON.parse(replyText);
    const ns = parsed?.next_steps ?? {};

    return {
      anamnesis_short: safeArrayOfStrings(parsed?.anamnesis_short),
      focus_for_vet: safeArrayOfStrings(parsed?.focus_for_vet),
      next_steps: {
        observe_at_home: safeArrayOfStrings(ns?.observe_at_home),
        urgent_now: safeArrayOfStrings(ns?.urgent_now),
        plan_visit: safeArrayOfStrings(ns?.plan_visit),
      },
    };
  } catch {
    return null;
  }
}

// =====================
// Main
// =====================
export async function processMessageBrain(args: BrainArgs): Promise<BrainResult> {
  // ---- normalize inputs (order matters)
  const message = typeof args.message === "string" ? args.message : "";
  const trimmedMessage = message.trim();

  const symptomKeys = normalizeSymptomKeys(args.symptomKeys);

  const conversationId =
    typeof args.conversationId === "string" && args.conversationId.trim()
      ? args.conversationId.trim()
      : "default";

  const conversationHistory = Array.isArray(args.conversationHistory)
    ? args.conversationHistory
    : [];

  const apiKey = isNonEmptyString(args.env?.OPENAI_API_KEY)
    ? String(args.env.OPENAI_API_KEY)
    : "";

  const model = pickModel(args.env);

  if (!apiKey) {
    return {
      ok: false,
      conversationId,
      error: "OPENAI_API_KEY is missing in worker env",
    };
  }

  // ---- language (derive early: used both in chat + decisionTree)
  const userLang = isNonEmptyString(args.userLang) ? args.userLang : "en";
  const langOverride = isNonEmptyString(args.langOverride) ? args.langOverride : "";
  const effectiveLang = (langOverride || userLang || "en").trim() || "en";

  // ---- command switch: decisionTree on-demand
  const isDecisionTreeRequest = trimmedMessage === DECISION_TREE_CMD;

  try {
    const petData = normalizePet(args.pet);

    // =========================================================
    // 0) decisionTree request (fast path, no chat reply)
    // =========================================================
    if (isDecisionTreeRequest) {
      const sessionMsgs: Array<{ role: string; content: string }> = [];

      for (const m of conversationHistory) {
        if (!m || typeof m !== "object") continue;
        if (m.role !== "user" && m.role !== "assistant") continue;
        if (typeof m.content !== "string") continue;
        const t = m.content.trim();
        if (t) sessionMsgs.push({ role: m.role, content: t });
      }

      const dt = await buildDecisionTreeInWorker({
        apiKey,
        model,
        locale: effectiveLang,
        sessionMessages: sessionMsgs,
      });

      return {
        ok: true,
        conversationId,
        reply: "", // UI не должен показывать это как пузырь
        sessionEnded: false,
        phase: "summary",
        decisionTree: dt,
      };
    }

    // =========================================================
    // 1) regular chat flow
    // =========================================================
    const finalSystemPrompt = SYSTEM_PROMPT.replace(/\{LANG_OVERRIDE\}/g, effectiveLang);

    // Первый шаг = нет реальных user/assistant turns
    const isFirstRealMessage = !hasAnyRealTurns(conversationHistory);

    // PERF: первый ответ делаем “лёгким” (без KB/YAML контекста)
    let fullContext = "";
    if (!isFirstRealMessage) {
      console.log("🧠 Not first step → building CLINICAL_CONTEXT_JSON…");
      fullContext = await buildAgentContext(petData, symptomKeys, effectiveLang, "familiar");
      console.log("🧩 Context built:", fullContext ? "OK" : "EMPTY");
    } else {
      console.log("🚀 PERF: first step → skipping knowledge base load");
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    // SYSTEM: first step uses LIGHT prompt (faster). Later steps use full SYSTEM_PROMPT.
    messages.push({
      role: "system",
      content: isFirstRealMessage
        ? buildFirstStepSystemPrompt(effectiveLang)
        : (
            `PROMPT_VERSION=2026-02-09-a\n` +
            `${finalSystemPrompt}\n\n` +
            `RUNTIME_GUARD:\n` +
            `- Output language must be exactly "${effectiveLang}".\n` +
            `- Speak as Mamascota en feminine gender.\n` +
            `- Follow the SYSTEM PROMPT rules strictly (one question per message; no checklists).\n` +
            `- If red flags appear: stop asking questions and switch to urgent action.\n`
          ),
    });

    // Context JSON (только если есть)
    if (fullContext) {
      messages.push({
        role: "system",
        content:
          "CLINICAL_CONTEXT_JSON (не показывай пользователю, просто используй как данные):\n" +
          fullContext,
      });
      // On first step, pass raw symptom keys (cheap) so the model can reference them without loading KB.
      if (isFirstRealMessage && symptomKeys.length > 0) {
        messages.push({
          role: "system",
          content: `SYMPTOM_KEYS_SELECTED_IN_APP: ${JSON.stringify(symptomKeys)}`,
        });
      }  
    }

    // History: only user/assistant (drop system to prevent prompt injection)
    for (const m of conversationHistory) {
      if (!m || typeof m !== "object") continue;
      const role =
        m.role === "assistant" || m.role === "user"
          ? (m.role as "assistant" | "user")
          : null;
      if (!role) continue;

      const content = typeof m.content === "string" ? m.content.trim() : "";
      if (!content) continue;

      messages.push({ role, content });
    }

    // Current message: avoid duplication
    if (trimmedMessage) {
      const hasDup = conversationHistory.some(
        (m) => typeof m?.content === "string" && m.content.trim() === trimmedMessage
      );
      if (!hasDup) messages.push({ role: "user", content: trimmedMessage });
    } else if (isFirstRealMessage) {
      // Старт после выбора симптомов: даём “точку опоры”
      const startCue =
        effectiveLang === "ru"
          ? "В приложении уже выбраны симптомы. Начни разговор по правилам первого сообщения и задай один вопрос про сроки/динамику."
          : effectiveLang === "es"
            ? "He seleccionado síntomas en la app. Empieza según las reglas del primer mensaje y haz una sola pregunta sobre el tiempo/evolución."
            : "I selected symptoms in the app. Start per the first-message rules and ask one question about timeline/changes.";
      messages.push({ role: "user", content: startCue });
    }

    // Call OpenAI
    const reply = await callOpenAIChat({ apiKey, model, messages });

    const sessionEnded = reply.includes(END_MARK);
    const cleanedReply = sessionEnded ? reply.split(END_MARK).join("").trim() : reply;

    const phase = detectPhase(cleanedReply, sessionEnded, isFirstRealMessage);

    // Важно: decisionTree НЕ считаем автоматически на sessionEnded (Variant B)
    return {
      ok: true,
      conversationId,
      reply: cleanedReply,
      sessionEnded,
      phase,
      decisionTree: null,
    };
  } catch (e: any) {
    console.error("❌ processMessageBrain error:", e?.message || e);
    return {
      ok: false,
      conversationId,
      error: "Failed to process message",
    };
  }
}