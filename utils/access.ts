import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_FLAGS = {
  pdfLimitEnabled: false,
};

export const DEV_ACCOUNT = {
  enabled: __DEV__,
  paid: true,
  plan: "yearly" as "monthly" | "yearly",
};

const PAID_KEY = "access.isPaid";
const PDF_LANG_SET_KEY = "access.pdfLangSet";

export async function getUsedPdfLanguages(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PDF_LANG_SET_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePdfLang(lang?: string): string {
  return String(lang || "en")
    .toLowerCase()
    .split("-")[0]
    .trim();
}

export async function addPdfLanguage(lang: string): Promise<void> {
  if (!ACCESS_FLAGS.pdfLimitEnabled) return;

  const normalizedLang = normalizePdfLang(lang);
  if (!normalizedLang) return;

  const current = await getUsedPdfLanguages();

  if (current.includes(normalizedLang)) return;

  const next = [...current, normalizedLang];

  await AsyncStorage.setItem(
    PDF_LANG_SET_KEY,
    JSON.stringify(next)
  );
}

export async function getPdfCount(): Promise<number> {
  const langs = await getUsedPdfLanguages();
  return langs.length;
}

export async function isPaid(): Promise<boolean> {
  if (DEV_ACCOUNT.enabled && DEV_ACCOUNT.paid) {
    return true;
  }

  const raw = await AsyncStorage.getItem(PAID_KEY);
  return raw === "true";
}

export async function setPaid(value = true): Promise<void> {
  await AsyncStorage.setItem(PAID_KEY, value ? "true" : "false");
}

export async function canGeneratePdf(lang?: string): Promise<boolean> {
  if (!ACCESS_FLAGS.pdfLimitEnabled) return true;

  if (await isPaid()) return true;

  const normalizedLang = normalizePdfLang(lang);

  const langs = await getUsedPdfLanguages();

  console.log("ACCESS DEBUG", {
    requested: lang,
    normalized: normalizedLang,
    stored: langs,
  });

  if (langs.includes(normalizedLang)) {
    return true;
  }

  if (langs.length === 0) {
    return true;
  }

  return false;
}