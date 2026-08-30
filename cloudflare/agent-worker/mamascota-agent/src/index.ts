// cloudflare/agent-worker/mamascota-agent/src/index.ts

import { processMessageBrain } from "./brain/processMessage";

export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  PLUS_RECOVERY: KVNamespace;
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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createPlusRecoveryCode(
  env: Env,
  email: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  const code = String(random % 1000000).padStart(6, "0");

  const emailHash = await sha256Hex(normalizedEmail);
  const codeHash = await sha256Hex(code);

  await env.PLUS_RECOVERY.put(
    `plus-recovery:${emailHash}`,
    JSON.stringify({
      codeHash,
      attempts: 0,
    }),
    {
      expirationTtl: 600,
    }
  );

  return code;
}

async function sendPlusRecoveryCode(
  env: Env,
  email: string,
  code: string
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mamascota <access@mamascota.com>",
      to: [email],
      subject: "Mamascota Plus access code",
      text: `Your Mamascota Plus access code is: ${code}\n\nThis code is valid for 10 minutes.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed (${response.status})`);
  }
}

async function requestPlusRecovery(
  env: Env,
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const hasActivePlus = await hasActiveStripeSubscription(
    env,
    normalizedEmail
  );

  if (!hasActivePlus) {
    return;
  }

  const code = await createPlusRecoveryCode(
    env,
    normalizedEmail
  );

  await sendPlusRecoveryCode(
    env,
    normalizedEmail,
    code
  );
}

async function verifyPlusRecoveryCode(
  env: Env,
  email: string,
  code: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const emailHash = await sha256Hex(normalizedEmail);
  const key = `plus-recovery:${emailHash}`;

  const raw = await env.PLUS_RECOVERY.get(key);

  if (!raw) {
    return false;
  }

  let stored: {
    codeHash?: string;
    attempts?: number;
  };

  try {
    stored = JSON.parse(raw);
  } catch {
    await env.PLUS_RECOVERY.delete(key);
    return false;
  }

  const attempts = Number(stored.attempts || 0);

  if (attempts >= 5 || !stored.codeHash) {
    await env.PLUS_RECOVERY.delete(key);
    return false;
  }

  const submittedHash = await sha256Hex(normalizedCode);

  if (submittedHash !== stored.codeHash) {
    await env.PLUS_RECOVERY.put(
      key,
      JSON.stringify({
        codeHash: stored.codeHash,
        attempts: attempts + 1,
      }),
      {
        expirationTtl: 600,
      }
    );

    return false;
  }

  await env.PLUS_RECOVERY.delete(key);
  return true;
}

async function hasActiveStripeSubscription(
  env: Env,
  email: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  const customerResponse = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(normalizedEmail)}&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!customerResponse.ok) {
    throw new Error(`Stripe customer lookup failed (${customerResponse.status})`);
  }

  const customerData = (await customerResponse.json()) as {
    data?: Array<{ id?: string }>;
  };

  for (const customer of customerData.data || []) {
    if (!customer.id) continue;

    const subscriptionsResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=all&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!subscriptionsResponse.ok) {
      throw new Error(
        `Stripe subscription lookup failed (${subscriptionsResponse.status})`
      );
    }

    const subscriptionsData = (await subscriptionsResponse.json()) as {
      data?: Array<{
        status?: string;
        items?: {
          data?: Array<{
            price?: {
              id?: string;
            };
          }>;
        };
      }>;
    };

    const plusPriceIds = new Set([
      "price_1TJi2JGuFot8wIxg2OJcqbTT",
      "price_1TkWFGGuFot8wIxgdOShWsWX",
    ]);

    const activePlus = (subscriptionsData.data || []).some((subscription) => {
      const isActive =
        subscription.status === "active" ||
        subscription.status === "trialing";

      if (!isActive) {
        return false;
      }

      return (subscription.items?.data || []).some((item) =>
        item.price?.id ? plusPriceIds.has(item.price.id) : false
      );
    });

    if (activePlus) {
      return true;
    }
  }

  return false;
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
    try {
      console.log("OPENAI_API_KEY present:", !!env.OPENAI_API_KEY);

      // CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          },
        });
      }

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
            model:
              (env as any).MAMASCOTA_MODEL_OVERRIDE ||
              env.OPENAI_MODEL ||
              null,
            now: new Date().toISOString(),
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

      if (url.pathname === "/plus/recovery/request") {
        if (req.method !== "POST") {
          return json({ ok: false, error: "Method not allowed" }, 405);
        }

        let body: { email?: unknown };

        try {
          body = (await req.json()) as { email?: unknown };
        } catch {
          return json({ ok: false, error: "Invalid JSON" }, 400);
        }

        const email =
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : "";

        if (email) {
          try {
            await requestPlusRecovery(env, email);
          } catch (err) {
            console.error("Plus recovery request failed:", err);
          }
        }

        return json({ ok: true }, 200);
      }

      if (url.pathname === "/plus/recovery/verify") {
        if (req.method !== "POST") {
          return json({ ok: false, error: "Method not allowed" }, 405);
        }

        let body: {
          email?: unknown;
          code?: unknown;
        };

        try {
          body = (await req.json()) as {
            email?: unknown;
            code?: unknown;
          };
        } catch {
          return json({ ok: false, error: "Invalid JSON" }, 400);
        }

        const email =
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : "";

        const code =
          typeof body.code === "string"
            ? body.code.trim()
            : "";

        if (!email || !code) {
          return json({ ok: false, paid: false }, 400);
        }

        const codeValid = await verifyPlusRecoveryCode(
          env,
          email,
          code
        );

        if (!codeValid) {
          return json({ ok: false, paid: false }, 401);
        }

        const hasActivePlus = await hasActiveStripeSubscription(
          env,
          email
        );

        if (!hasActivePlus) {
          return json({ ok: false, paid: false }, 403);
        }

        return json({
          ok: true,
          paid: true,
        });
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
        typeof body?.internalCommand === "string"
          ? body.internalCommand.trim()
          : "";

      const effectiveMessage = internalCommand || message;
      const pet = body?.pet;

      const symptomKeys = Array.isArray(body?.symptomKeys)
        ? body.symptomKeys.filter((x) => typeof x === "string")
        : [];

      const userLang =
        typeof body?.userLang === "string" ? body.userLang : "en";

      const conversationId =
        typeof body?.conversationId === "string" && body.conversationId.trim()
          ? body.conversationId.trim()
          : "default";

      const conversationHistory = normalizeHistory(body?.conversationHistory);

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
    } catch (err: any) {
      console.error("❌ Worker crash:", err);

      return json(
        {
          ok: false,
          error: err?.message || "Worker crash",
          where: "fetch",
        },
        500
      );
    }
  },
};
