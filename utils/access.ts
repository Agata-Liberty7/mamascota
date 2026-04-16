import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_FLAGS = {
  pdfLimitEnabled: false,
};

const TRIAL_DAYS = 14;
const MAX_FREE_PDFS = 3;

const TRIAL_START_KEY = "access.trialStart";
const PAID_KEY = "access.isPaid";

export async function getTrialStart(): Promise<number> {
  const raw = await AsyncStorage.getItem(TRIAL_START_KEY);

  if (!raw) {
    const now = Date.now();
    await AsyncStorage.setItem(TRIAL_START_KEY, String(now));
    return now;
  }

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const now = Date.now();
  await AsyncStorage.setItem(TRIAL_START_KEY, String(now));
  return now;
}

export async function isTrialActive(): Promise<boolean> {
  const start = await getTrialStart();
  const now = Date.now();
  return now - start < TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

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

export async function addPdfLanguage(lang: string): Promise<void> {
  if (!ACCESS_FLAGS.pdfLimitEnabled) return;

  const current = await getUsedPdfLanguages();
  if (current.includes(lang)) return;

  const next = [...current, lang];
  await AsyncStorage.setItem(PDF_LANG_SET_KEY, JSON.stringify(next));
}

export async function getPdfCount(): Promise<number> {
  const langs = await getUsedPdfLanguages();
  return langs.length;
}

export async function isPaid(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PAID_KEY);
  return raw === "true";
}

export async function setPaid(value = true): Promise<void> {
  await AsyncStorage.setItem(PAID_KEY, value ? "true" : "false");
}

export async function canGeneratePdf(lang?: string): Promise<boolean> {
  if (!ACCESS_FLAGS.pdfLimitEnabled) return true;

  if (await isPaid()) return true;
  if (!(await isTrialActive())) return false;

  if (!lang) {
    const count = await getPdfCount();
    return count < MAX_FREE_PDFS;
  }

  const langs = await getUsedPdfLanguages();

  // повтор языка — бесплатно
  if (langs.includes(lang)) return true;

  return langs.length < MAX_FREE_PDFS;
}