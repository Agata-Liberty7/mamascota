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
  needsFinalize?: boolean;
  recommendNewConsultation?: boolean;
  newConsultationReason?: string;
  phase?: "intake" | "clarify" | "summary" | "ended";
  decisionTree?: {
    anamnesis_short: string[];
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
  postSummaryUpdateMode?: boolean;
};

// =====================
// Helpers (pure)
// =====================
const END_MARK = "[SESSION_ENDED]";
const DECISION_TREE_CMD = "__MAMASCOTA_DECISION_TREE__";
const FINALIZE_CMD = "__MAMASCOTA_FINALIZE__";

const PROMPT_VERSION = "2026-02-21-perf-first-light";

type CachedClinicalContext = {
  signature: string;
  value: string;
  createdAt: number;
};

const CLINICAL_CONTEXT_CACHE = new Map<string, CachedClinicalContext>();
const CLINICAL_CONTEXT_TTL_MS = 30 * 60 * 1000;

function buildClinicalContextSignature(args: {
  petData: any;
  symptomKeys: string[];
  effectiveLang: string;
}) {
  const pet = args.petData || {};
  return JSON.stringify({
    lang: args.effectiveLang,
    symptomKeys: Array.isArray(args.symptomKeys) ? [...args.symptomKeys].sort() : [],
    pet: {
      species: pet.species ?? null,
      breed: pet.breed ?? null,
      sex: pet.sex ?? null,
      ageYears: pet.ageYears ?? null,
      neutered: !!pet.neutered,
    },
  });
}

function getCachedClinicalContext(conversationId: string, signature: string): string | null {
  const cached = CLINICAL_CONTEXT_CACHE.get(conversationId);
  if (!cached) return null;

  const expired = Date.now() - cached.createdAt > CLINICAL_CONTEXT_TTL_MS;
  if (expired) {
    CLINICAL_CONTEXT_CACHE.delete(conversationId);
    return null;
  }

  if (cached.signature !== signature) return null;
  return cached.value || null;
}

function setCachedClinicalContext(conversationId: string, signature: string, value: string) {
  if (!conversationId || !value) return;
  CLINICAL_CONTEXT_CACHE.set(conversationId, {
    signature,
    value,
    createdAt: Date.now(),
  });
}

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
    `Communication style: natural, human, conversational. Avoid repetitive templates or fixed phrases.`,
    `Do NOT start with formulaic expressions like "I see that..." or similar predictable constructions.`,
    `Do NOT output chunk delimiters like "[CHUNK]".`,
    `Do NOT write filler acknowledgements like "Okay", "Got it", "Thanks", "Understood", "Приняла", "Хорошо, спасибо". Start directly with helpful content.`,
    `Rules:`,
    `- Ask for ONLY ONE thing from the user per message (one request). Do not chain requests with "and/also/in addition".`,
    `- One question per message does NOT mean early closure: keep exploring clinically relevant directions step by step if important gaps remain.`,
    `- If symptomKeys are provided in APP_CONTEXT_JSON, you MUST explicitly cover them across the first 1–2 assistant messages (do not ignore any selected symptom).`,
    `- By your 2nd–3rd assistant message, you may add ONE very short explanation (1 sentence) of how the main symptoms may be connected. Do this ONLY ONCE per conversation, and only if it truly helps the next question.`,
    `- No checklists.`,
    `- Keep wording simple and concise, but do not reduce clinical depth.`,
    `- Do not add long explanations, but do continue collecting relevant facts if important gaps remain.`,
    `- No diagnoses, no medications, no treatment plans.`,
    `- If urgent red flags are present, stop asking questions and tell the owner to seek urgent care now.`,
    `First message goal:`,
    `- If APP_CONTEXT_JSON contains pet data, you may briefly and naturally reference the pet (name, age, species, breed if relevant).`,
    `- Then ask ONE question about timeline or changes.`,
    `- Vary sentence structure. Avoid repeating the same opening pattern across conversations.`,
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

function detectSymptomClusters(text: string, symptomKeys: string[]) {
  const hay = `${String(text || "").toLowerCase()} ${Array.isArray(symptomKeys) ? symptomKeys.join(" ").toLowerCase() : ""}`;

  const hasAny = (patterns: string[]) => patterns.some((p) => hay.includes(p));

  return {
    gi: hasAny([
      "diarrhea", "vomit", "vomiting", "stool", "appetite", "nausea", "weight_loss", "weight loss"
    ]),
    respiratory: hasAny([
      "cough", "dyspnea", "shortness of breath", "breathing", "respiratory", "одыш", "каш"
    ]),
    musculoskeletal: hasAny([
      "lameness", "limping", "limp", "paw", "leg", "хром"
    ]),
    urinary: hasAny([
      "urination", "urine", "peeing", "drinking", "thirst", "моч", "пьет", "жаж"
    ]),
    neuro: hasAny([
      "seizure", "ataxia", "collapse", "tremor", "невро", "судорог"
    ]),
  };
}

function shouldRecommendNewConsultation(args: {
  postSummaryUpdateMode: boolean;
  message: string;
  symptomKeys: string[];
}): { recommend: boolean; reason: string } {
  if (!args.postSummaryUpdateMode) {
    return { recommend: false, reason: "" };
  }

  const clusters = detectSymptomClusters(args.message, args.symptomKeys);

  const activeClusters = [
    clusters.gi ? "gi" : "",
    clusters.respiratory ? "respiratory" : "",
    clusters.musculoskeletal ? "musculoskeletal" : "",
    clusters.urinary ? "urinary" : "",
    clusters.neuro ? "neuro" : "",
  ].filter(Boolean);

  if (activeClusters.length >= 2) {
    return {
      recommend: true,
      reason: `multiple_clusters:${activeClusters.join(",")}`,
    };
  }

  return { recommend: false, reason: "" };
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

// =====================
// Guard helpers (runtime)
// =====================
function countAssistantTurns(history: Array<{ role: string; content: string }>) {
  return (history || []).filter(
    (m) => m?.role === "assistant" && typeof m?.content === "string" && m.content.trim().length > 0
  ).length;
}

function buildSymptomCoverageInstruction(symptomKeys: string[], assistantTurnsSoFar: number) {
  if (!Array.isArray(symptomKeys) || symptomKeys.length === 0) return "";
  // Требование: покрыть все выбранные симптомы в первые 1–2 хода ассистента.
  // Самый надёжный хотфикс: в 0-м и 1-м ответе ассистент ОБЯЗАН упомянуть ВСЕ symptomKeys (кратко, без чеклиста),
  // но запрос к пользователю всё равно должен быть ОДИН.
  if (assistantTurnsSoFar > 1) return "";

  const keys = symptomKeys.slice(0, 3); // по контракту до 3
  return [
    `SYMPTOM_KEYS_GUARD (high priority):`,
    `- The user selected symptomKeys: ${keys.map((k) => `"${k}"`).join(", ")}.`,
    `- In THIS reply you MUST explicitly acknowledge EACH selected symptomKey at least once (briefly, naturally, not as a checklist).`,
    `- Still ask for ONLY ONE thing from the user in this message.`,
  ].join("\n");
}

/**
 * Detect "multiple requests" without counting '?'
 * Heuristic: flags if there are 2+ separate "asks" patterns.
 * We keep it conservative to avoid false positives.
 */
function detectMultipleRequests(replyText: string) {
  const text = String(replyText || "").trim();
  if (!text) return false;

  // 1) 2+ question marks => very likely 2+ questions/asks
  const qCount = (text.match(/[?¿]/g) || []).length;
  if (qCount >= 2) return true;

  // 2) Explicit numbering 1) ... 2) ...
  if (/(^|\n)\s*1\)\s+/.test(text) && /(^|\n)\s*2\)\s+/.test(text)) return true;

  // 3) Two separate question-like lines
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const questionLikeLines = lines.filter((l) => /[?¿]$/.test(l));
  if (questionLikeLines.length >= 2) return true;

  return false;
}

function sanitizeAssistantReply(replyText: string) {
  let t = String(replyText || "");

  // Remove the legacy/broken variant only. Keep canonical [CHUNK] for client bubble splitting.
  t = t.replace(/\[\s*\[\s*CHUNK\s*\]\s*\]/gi, "");
  t = t.replace(/\[\[CHUNK\]\]/gi, "");

  // Remove lines that are ONLY "[" or "]"
  t = t.replace(/^\s*[\[\]]\s*$/gm, "");

  // Remove leading filler acknowledgements (best-effort, only at the very start)
  t = t.replace(/^\s*(Приняла\.?\s*)/i, "");
  t = t.replace(/^\s*(Поняла\.?\s*)/i, "");
  t = t.replace(/^\s*(Хорошо,\s*спасибо\.?\s*)/i, "");
  t = t.replace(/^\s*(Поняла|Приняла)\s*[—\-–:]\s*/i, "");

  // Normalize excessive empty lines
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  return t;
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
Analyze the veterinary dialogue below and return STRICT JSON only, with no extra text.

Expected JSON format:
{
  "anamnesis_short": ["..."],
  "next_steps": {
    "observe_at_home": ["..."],
    "urgent_now": ["..."],
    "plan_visit": ["..."]
  }
}

Requirements:
- Output language must be exactly: ${locale}.
- Return NOTHING before or after the JSON.
- Use only facts explicitly confirmed in the dialogue.
- Do not invent, assume, or infer unsupported facts.
- Include ALL clinically relevant confirmed facts from the conversation.
- Do not omit later clarifications or corrections from the owner.
- If the owner corrected earlier information, use the latest clarified version.
- Include important negatives when they affect triage or interpretation
  (for example: "no cough", "not at rest", "no vomiting").
- Do not shorten the anamnesis just for brevity.
- Do NOT include stable passport data of the pet inside "anamnesis_short"
  if it is already shown in the separate animal data section.
- Exclude name, species, breed, sex and age from "anamnesis_short"
  unless one of them is directly clinically relevant to the current case
  and changes triage or the interpretation of symptoms.

Section rules:
- "anamnesis_short":
  - include all clinically relevant confirmed facts from the dialogue;
  - usually 5-10 bullet points;
  - more than 10 is allowed if needed for completeness;
  - each bullet must contain one clear fact;
  - do not merge several separate facts into one vague sentence;
  - do not repeat pet identity/profile facts already covered elsewhere
    (name, species, breed, sex, age), unless they are clinically relevant.
- "observe_at_home":
  - 2-5 practical points;
  - no medications, no treatment instructions.
- "urgent_now":
  - 3-6 clear red flags or reasons for urgent care.
- "plan_visit":
  - 1-3 short practical points explaining why an in-person visit is needed.

Boundaries:
- Do not diagnose.
- Do not prescribe medications or treatment plans.
- Do not interpret lab results.
- Do not make unsupported clinical conclusions.

SESSION:
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

  const postSummaryUpdateMode = !!args.postSummaryUpdateMode;

  const newConsultationDecision = shouldRecommendNewConsultation({
    postSummaryUpdateMode,
    message: trimmedMessage,
    symptomKeys,
  });
  

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
  const isFinalizeRequest = trimmedMessage === FINALIZE_CMD;

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
    const assistantTurnsSoFar = countAssistantTurns(conversationHistory);
    const symptomCoverageGuard = buildSymptomCoverageInstruction(symptomKeys, assistantTurnsSoFar);

    // PERF: первый ответ делаем “лёгким” (без KB/YAML контекста)
    let fullContext = "";
    if (!isFirstRealMessage) {
      const contextSignature = buildClinicalContextSignature({
        petData,
        symptomKeys,
        effectiveLang,
      });

      const cachedContext = getCachedClinicalContext(conversationId, contextSignature);

      if (cachedContext) {
        fullContext = cachedContext;
        console.log("⚡ CLINICAL_CONTEXT_JSON cache hit");
      } else {
        console.log("🧠 Not first step → building CLINICAL_CONTEXT_JSON…");
        fullContext = await buildAgentContext(petData, symptomKeys, effectiveLang, "familiar");
        console.log("🧩 Context built:", fullContext ? "OK" : "EMPTY");

        if (fullContext) {
          setCachedClinicalContext(conversationId, contextSignature, fullContext);
        }
      }
    } else {
      console.log("🚀 PERF: first step → skipping knowledge base load");
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    // SYSTEM: first step uses LIGHT prompt (faster). Later steps use full SYSTEM_PROMPT.
    messages.push({
      role: "system",
      content: isFirstRealMessage
        ? (
            buildFirstStepSystemPrompt(effectiveLang) +
            (symptomCoverageGuard ? `\n\n${symptomCoverageGuard}\n` : "")
          )
        : (
            `PROMPT_VERSION=2026-02-09-a\n` +
            `${finalSystemPrompt}\n\n` +
            `RUNTIME_GUARD:\n` +
            `- Output language must be exactly "${effectiveLang}".\n` +
            `- Speak as Mamascota in feminine gender.\n` +
            `- Ask for ONLY ONE thing from the user per message (one request). Do not chain requests with "also/and/in addition", naturally, without meta-phrases. Do not announce that you are asking a question.\n` +
            `- You MUST not ignore any provided symptomKeys from APP_CONTEXT_JSON: if 2–3 symptoms are selected, explicitly cover each across the next 1–2 turns.\n` +
            `- By your 2nd–3rd assistant message, you may add ONE very short explanation (1 sentence) of how the main symptoms may be connected. Do this ONLY ONCE per conversation, and only if it helps the next question.\n` +
            `- Avoid repeating a question that was already asked in the last 6 turns.\n` +
            `- No checklists.\n` +
            `- Prefer concise wording, but do NOT end early if clinically relevant gaps remain.\n` +
            `- Before moving to summary, continue step-by-step through relevant symptom axes when they are indicated by the case (for example appetite, thirst, activity, stool/vomiting, recent changes, external triggers).\n` +
            `- Do NOT explain every question.\n` +
            `- Explain a question only if it changes the direction of reasoning and the transition would otherwise be unclear.\n` +
            `- Do NOT write filler acknowledgements like "Okay", "Got it", "Thanks", "Understood", "Приняла", "Хорошо, спасибо". Start directly with helpful content.\n` +
            `- Do NOT output chunk delimiters like "[CHUNK]" or "[[CHUNK]]".\n` +
            `- If red flags appear: stop asking questions and switch to urgent action.\n` +

            (postSummaryUpdateMode
              ? `\nPOST_SUMMARY_UPDATE_MODE:\n` +
                `- This is NOT a new intake. The case was already assessed.\n` +
                `- Do NOT restart the questionnaire from the beginning.\n` +
                `- Ask at most ONE clarifying question, and only if strictly necessary.\n` +
                `- If the new detail clearly fits the existing clinical path, integrate it and move toward an updated conclusion.\n` +
                `- If no clarification is needed, provide a short update and STOP.\n` +
                `- If a newly introduced symptom or concern does NOT belong to the current clinical path, do NOT try to force it into the existing case.\n` +
                `- Do NOT ignore that symptom.\n` +
                `- Do NOT start a new question flow about that symptom inside the current consultation.\n` +
                `- Instead, briefly acknowledge it and clearly recommend starting a NEW consultation focused on that separate problem.\n` +
                `- Explain this as a way to keep two different diagnostic paths clear and accurate.\n` +
                `- Keep this recommendation short, warm, confident, and user-friendly.\n` +
                `- After recommending a new consultation, STOP and do not ask another question in the current session.\n`
              : ""
            ) +

            (symptomCoverageGuard ? `\n${symptomCoverageGuard}\n` : "")
          ),
    });

    // ✅ Always pass lightweight app context (even on first step)
    messages.push({
      role: "system",
      content:
        "APP_CONTEXT_JSON (use as structured data, do not show to user):\n" +
        JSON.stringify({
          pet: petData,
          symptomKeys,
          language: effectiveLang,
        }),
    });

    // Heavy KB context only when built (non-first step)
    if (fullContext) {
      messages.push({
        role: "system",
        content:
          "CLINICAL_CONTEXT_JSON (не показывай пользователю, просто используй как данные):\n" +
          fullContext,
      });
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
      // Internal start trigger (not shown to the user in the app)
      messages.push({ role: "user", content: "__MAMASCOTA_START__" });
    }
    if (isFinalizeRequest) {
      messages.push({
        role: "system",
        content: [
          "FINALIZE_MODE:",
          "- Produce the final summary now.",
          "- Do NOT ask questions.",
          "- Return 2 to 4 short standalone blocks.",
          "- Insert [CHUNK] on its own line between every block.",
          "- Do NOT merge all sections into one continuous paragraph.",
          `- End your message with ${END_MARK} exactly once.`,
        ].join("\n"),
      });
    }
    // Call OpenAI
    let reply = await callOpenAIChat({ apiKey, model, messages });

    if (isFinalizeRequest && !/\[\[?CHUNK\]?\]/i.test(reply)) {
      const paragraphParts = String(reply)
        .replace(END_MARK, "")
        .split(/\n\s*\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (paragraphParts.length >= 2 && paragraphParts.length <= 4) {
        reply =
          paragraphParts.join("\n[CHUNK]\n") +
          (reply.includes(END_MARK) ? `\n${END_MARK}` : "");
      }
    }

    // ---- post-guard: if model violated "one request", do a single lightweight rewrite pass
    // This is only triggered when we detect likely 2+ asks without using '?' counting.
    const needsRepair = detectMultipleRequests(reply);
    if (needsRepair) {
      console.log("🛠️ Guard repair: rewriting reply to enforce ONE request");
      const repair = await callOpenAIChat({
        apiKey,
        model,
        messages: [
          {
            role: "system",
            content: [
              `You are a strict editor.`,
              `Rewrite the assistant message to comply with rules. Keep meaning, keep tone, keep language exactly "${effectiveLang}".`,
              `Rules (must all hold):`,
              `- Ask the user for ONLY ONE thing (single request).`,
              `- Do NOT add new questions.`,
              `- Do NOT add checklists or numbering.`,
              `- Do NOT diagnose or prescribe.`,
              `- If symptomKeys are mentioned below, keep them acknowledged in a natural way.`,
              `Return ONLY the rewritten assistant message.`,
            ].join("\n"),
          },
          {
            role: "user",
            content:
              `Original message:\n` +
              reply +
              `\n\nSelected symptomKeys:\n` +
              JSON.stringify(symptomKeys.slice(0, 3)) +
              `\n`,
          },
        ],
      });

      if (typeof repair === "string" && repair.trim()) {
        reply = repair.trim();
      }
    }

    const sessionEnded = reply.includes(END_MARK);
    let cleanedReply = sessionEnded ? reply.split(END_MARK).join("").trim() : reply;

    // Final output cleanup (no stray chunk brackets)
    cleanedReply = sanitizeAssistantReply(cleanedReply);

    // ✅ “поймали старт финализации”: модель поставила END_MARK,
    // но финальный текст отдаём только по спец-команде FINALIZE_CMD
    if (sessionEnded && !isFinalizeRequest) {
      return {
        ok: true,
        conversationId,
        reply: "",
        sessionEnded: false,
        needsFinalize: true,
        recommendNewConsultation: newConsultationDecision.recommend,
        newConsultationReason: newConsultationDecision.reason || undefined,
        phase: "summary",
        decisionTree: null,
      };
    }

    const phase = detectPhase(cleanedReply, sessionEnded, isFirstRealMessage);

    return {
      ok: true,
      conversationId,
      reply: cleanedReply,
      sessionEnded,
      needsFinalize: false,
      recommendNewConsultation: newConsultationDecision.recommend,
      newConsultationReason: newConsultationDecision.reason || undefined,
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