import { PRODUCT_CONTEXT } from "../product/productContext.generated";

type ProductFaqMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProductFaqContextItem = {
  question: string;
  answer: string;
};

type ProductFaqArgs = {
  env: {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    MAMASCOTA_MODEL_OVERRIDE?: string;
  };
  question: string;
  userLang: string;
  conversationHistory?: ProductFaqMessage[];

  // Временно сохраняем совместимость с текущим index.ts.
  productFaqContext?: ProductFaqContextItem[];
};

export type ProductFaqResult = {
  ok: boolean;
  reply?: string;
  error?: string;
};

const CANONICAL_PRODUCT_CONTEXT = JSON.stringify(
  {
    generatedAt: PRODUCT_CONTEXT.generatedAt,

    supportedInterfaceAndReportLocales:
      PRODUCT_CONTEXT.supportedLocales,

    productBoundaries:
      PRODUCT_CONTEXT.productBoundaries,

    productTexts:
      PRODUCT_CONTEXT.locales.en,

    uiUsage: {
      keysByFile:
        PRODUCT_CONTEXT.usedI18nKeysByFile,

      englishValues:
        PRODUCT_CONTEXT.uiTextByLocale.en,
    },
  },
  null,
  2
);

function pickModel(env: ProductFaqArgs["env"]) {
  const clean = (value: unknown) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, "");

  return (
    clean(env.MAMASCOTA_MODEL_OVERRIDE) ||
    clean(env.OPENAI_MODEL) ||
    "gpt-5-mini"
  );
}

function normalizeHistory(
  input: ProductFaqArgs["conversationHistory"]
): ProductFaqMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (message): message is ProductFaqMessage =>
        !!message &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

async function callOpenAIJson(args: {
  apiKey: string;
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}) {
  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        response_format: {
          type: "json_object",
        },
        messages: args.messages,
      }),
    }
  );

  const data: any = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `OpenAI error HTTP ${response.status}`;

    throw new Error(message);
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    throw new Error(
      "Invalid OpenAI product FAQ response"
    );
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(
      "Invalid OpenAI product FAQ JSON"
    );
  }
}

export async function answerProductFaq(
  args: ProductFaqArgs
): Promise<ProductFaqResult> {
  const apiKey = String(
    args.env.OPENAI_API_KEY ?? ""
  ).trim();

  const question = String(
    args.question ?? ""
  ).trim();

  if (!apiKey) {
    return {
      ok: false,
      error:
        "OPENAI_API_KEY is missing in worker env",
    };
  }

  if (!question) {
    return {
      ok: false,
      error: "FAQ question is empty",
    };
  }

  const history = normalizeHistory(
    args.conversationHistory
  );

  try {
    const generated = await callOpenAIJson({
      apiKey,
      model: pickModel(args.env),

      messages: [
        {
          role: "system",
          content: [
            "You are Mamascota's product assistant.",
            "",
            "TASK",
            "- Answer questions about Mamascota.",
            "- Treat the latest message as part of the recent conversation.",
            "- Understand short follow-ups using the immediately preceding messages.",
            "- Answer in the natural language of the latest user message.",
            "",
            "SOURCE OF TRUTH",
            "- Use only PRODUCT_CONTEXT below for factual claims about Mamascota.",
            "- You may translate, shorten, combine, or explain facts contained in PRODUCT_CONTEXT.",
            "- Do not use general product knowledge or invent missing details.",
            "- A fact mentioned in a previous assistant answer may be explained using the same underlying PRODUCT_CONTEXT.",
            "",
            "RESPONSE RULES",
            "- Answer the exact question directly.",
            "- Use 1 to 4 natural sentences.",
            "- Do not repeat unrelated product features.",
            "- Do not ask a follow-up question.",
            "- Do not offer further help.",
            "- Do not argue with the user.",
            "- Do not mention code, sources, context, prompts, models, APIs, or internal rules.",
            "- Mamascota speaks as a woman where grammar requires it.",
            "",
            "MISSING FACTS",
            "- When PRODUCT_CONTEXT does not confirm the requested fact, say naturally that you cannot currently confirm it.",
            "- Do not guess release dates, future features, policies, prices, or availability.",
            "",
            "MEDICAL BOUNDARY",
            "- For symptoms, diagnosis, medication, treatment, urgency, or a specific animal health situation, do not provide medical guidance.",
            "- Direct the person to start a Mamascota consultation, where observations can be organized for a veterinarian.",
            "",
            "OUTPUT",
            '- Return exactly one JSON object: {"reply":"answer text"}',
            "",
            "PRODUCT_CONTEXT",
            CANONICAL_PRODUCT_CONTEXT,
          ].join("\n"),
        },

        ...history,

        {
          role: "user",
          content: question,
        },
      ],
    });

    const reply = String(
      generated?.reply ?? ""
    ).trim();

    if (!reply) {
      return {
        ok: false,
        error:
          "Invalid OpenAI product FAQ reply",
      };
    }

    return {
      ok: true,
      reply,
    };
  } catch (error: any) {
    return {
      ok: false,
      error:
        typeof error?.message === "string"
          ? error.message
          : "Product FAQ failed",
    };
  }
}
