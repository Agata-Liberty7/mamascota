// cloudflare/agent-worker/mamascota-agent/src/index.ts

import { processMessageBrain } from "./brain/processMessage";

export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

type AgentRequestBody = {
  message?: string;
  internalCommand?: string;
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
  conversationId?: string;

  // ✅ NEW: хвост истории (10–20 сообщений)
  conversationHistory?: ChatMsg[];
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    },
  });
}

function normalizeHistory(input: any): ChatMsg[] {
  if (!Array.isArray(input)) return [];

  const out: ChatMsg[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;

    const role = m.role;
    const content = typeof m.content === "string" ? m.content : "";

    if (
      (role === "system" || role === "user" || role === "assistant") &&
      content.trim().length > 0
    ) {
      out.push({ role, content: content.trim() });
    }
  }
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    console.log("OPENAI_API_KEY present:", !!env.OPENAI_API_KEY);

    // CORS preflight
    if (req.method === "OPTIONS") return json({ ok: true }, 204);

    const url = new URL(req.url);
    
    // ✅ Health endpoint (GET/HEAD)
    if (url.pathname === "/health") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }

      const cf = (req as any).cf || {};

      return json(
        {
          ok: true,
          status: "up",
          hasApiKey: !!env.OPENAI_API_KEY,
          model: (env as any).MAMASCOTA_MODEL_OVERRIDE || env.OPENAI_MODEL || null,
          now: new Date().toISOString(),

          // 👇 критично для диагностики без VPN
          cf: {
            colo: cf.colo || null,
            country: cf.country || null,
            city: cf.city || null,
            asn: cf.asn || null,
            httpProtocol: cf.httpProtocol || null,
          },
        },
        200
      );
    }


    // ✅ Main agent endpoint
    if (url.pathname !== "/agent") {
      return json({ ok: false, error: "Not found" }, 404);
    }
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }
    let body: AgentRequestBody | null = null;

    try {
      body = (await req.json()) as AgentRequestBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const message = typeof body?.message === "string" ? body.message : "";
    const internalCommand =
      typeof body?.internalCommand === "string" ? body.internalCommand.trim() : "";

    const effectiveMessage = internalCommand || message;

    const pet = body?.pet;

    const symptomKeys = Array.isArray(body?.symptomKeys)
      ? body.symptomKeys.filter((x) => typeof x === "string")
      : [];

    const userLang =
      typeof body?.userLang === "string" ? body.userLang : "en";

    const conversationId =
      typeof body?.conversationId === "string" &&
      body.conversationId.trim()
        ? body.conversationId.trim()
        : "default";

    // история из приложения
    const conversationHistory = normalizeHistory( 
      body?.conversationHistory
    );

    // 🔧 быстрый health-check (можно оставить)
    if (message === "ping") {
      return json({
        ok: true,
        pong: true,
        conversationId,
        hasApiKey: !!env.OPENAI_API_KEY,
        model:
          (env as any).MAMASCOTA_MODEL_OVERRIDE ||
          env.OPENAI_MODEL ||
          null,
      });
    }

    // message:"" — нормальный старт после выбора симптомов
    const result = await processMessageBrain({
      env,
      message: effectiveMessage,
      pet,
      symptomKeys,
      userLang,
      conversationId,
      conversationHistory,
      langOverride: userLang,
    });

    return json(result, result.ok ? 200 : 500);
  },
};
