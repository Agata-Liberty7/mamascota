import { processMessageBrain } from "./processMessage";

async function run() {
  // кейс 1 — НЕТ текста, ЕСТЬ симптомы (ключевой сценарий)
  const r1 = await processMessageBrain({
    env: {},
    message: "",
    pet: {
      name: "Муся",
      species: "cat",
      ageYears: 5,
      neutered: false,
    },
    symptomKeys: ["vomiting", "diarrhea"],
    userLang: "ru",
    conversationId: "test-1",
  });

  console.log("\nCASE 1:", r1);

  // кейс 2 — вообще пусто
  const r2 = await processMessageBrain({
    env: {},
    message: "",
    symptomKeys: [],
    conversationId: "test-2",
  });

  console.log("\nCASE 2:", r2);

  // кейс 3 — есть текст
  const r3 = await processMessageBrain({
    env: {},
    message: "Он плохо ест",
    symptomKeys: ["appetite_loss"],
    conversationId: "test-3",
  });

  console.log("\nCASE 3:", r3);
}

run();
