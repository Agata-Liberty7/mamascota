import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_DAYS = 14;
const MAX_FREE_PDFS = 3;

const TRIAL_START_KEY = "access.trialStart";
const PDF_COUNT_KEY = "access.pdfCount";
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

export async function getPdfCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(PDF_COUNT_KEY);
  const parsed = Number(raw || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function incrementPdfCount(): Promise<number> {
  const current = await getPdfCount();
  const next = current + 1;
  await AsyncStorage.setItem(PDF_COUNT_KEY, String(next));
  return next;
}

export async function isPaid(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PAID_KEY);
  return raw === "true";
}

export async function setPaid(value = true): Promise<void> {
  await AsyncStorage.setItem(PAID_KEY, value ? "true" : "false");
}

export async function canGeneratePdf(): Promise<boolean> {
  if (await isPaid()) return true;
  if (!(await isTrialActive())) return false;

  const pdfCount = await getPdfCount();
  return pdfCount < MAX_FREE_PDFS;
}