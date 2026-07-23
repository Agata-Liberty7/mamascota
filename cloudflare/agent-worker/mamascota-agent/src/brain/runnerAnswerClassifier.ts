import type { RunnerOption } from "./algorithmRunner";

type ClassifyRunnerAnswerArgs = {
  question: string;
  options: RunnerOption[];
  userAnswer: string;
  callModel: (messages: Array<{
    role: "system" | "user";
    content: string;
  }>) => Promise<string>;
};

type ClassifierResult = {
  selectedOptionKey: string | null;
};

function parseClassifierResult(
  rawReply: string,
  allowedOptionKeys: Set<string>
): ClassifierResult {
  try {
    const parsed = JSON.parse(String(rawReply || "").trim());
    const selectedOptionKey =
      typeof parsed?.selectedOptionKey === "string"
        ? parsed.selectedOptionKey.trim()
        : "";

    if (
      selectedOptionKey &&
      allowedOptionKeys.has(selectedOptionKey)
    ) {
      return { selectedOptionKey };
    }
  } catch {
    // Invalid model output is treated as unknown.
  }

  return { selectedOptionKey: null };
}

export async function classifyRunnerAnswer(
  args: ClassifyRunnerAnswerArgs
): Promise<ClassifierResult> {
  const question = String(args.question || "").trim();
  const userAnswer = String(args.userAnswer || "").trim();

  const options = Array.isArray(args.options)
    ? args.options.filter(
        (option) =>
          option &&
          typeof option.normalizedKey === "string" &&
          option.normalizedKey.trim()
      )
    : [];

  if (!question || !userAnswer || !options.length) {
    return { selectedOptionKey: null };
  }

  const allowedOptionKeys = new Set(
    options.map((option) => option.normalizedKey)
  );

  const messages: Array<{
    role: "system" | "user";
    content: string;
  }> = [
    {
      role: "system",
      content: [
        "You classify a natural-language answer into one allowed deterministic runner option.",
        "Return strict JSON only.",
        'Format: {"selectedOptionKey":"allowed_key"}',
        'If the answer does not clearly select one option, return {"selectedOptionKey":null}.',
        "Never invent an option.",
        "Do not answer the clinical question.",
        "Do not add explanations.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        question,
        allowedOptions: options.map((option) => ({
          key: option.normalizedKey,
          sourceLabel: option.rawKey,
        })),
        userAnswer,
      }),
    },
  ];

  try {
    const reply = await args.callModel(messages);

    console.log("[RUNNER_CLASSIFIER] reply", {
      question,
      userAnswer,
      allowedOptionKeys: Array.from(allowedOptionKeys),
      reply,
    });

    return parseClassifierResult(reply, allowedOptionKeys);
  } catch (error) {
    console.error("[RUNNER_CLASSIFIER] failed", {
      question,
      userAnswer,
      allowedOptionKeys: Array.from(allowedOptionKeys),
      error: error instanceof Error ? error.message : String(error),
    });

    return { selectedOptionKey: null };
  }
}
