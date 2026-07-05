// i18n.ts (минимальный апдейт)
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

import bg from "./locales/bg.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import he from "./locales/he.json";
import it from "./locales/it.json";
import ka from "./locales/ka.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import sr from "./locales/sr.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";

const i18n = new I18n({ bg, de, en, es, fr, he, it, ka, pl, pt, ru, sr, tr, uk });
i18n.enableFallback = true;

const SUPPORTED = ["bg", "de", "en", "es", "fr", "he", "it", "ka", "pl", "pt", "ru", "sr", "tr", "uk"] as const;
type Lang = (typeof SUPPORTED)[number];

const KEY = "selectedLanguage";
const norm = (code?: string | null): Lang | null => {
  if (!code) return null;
  const short = code.toLowerCase().split("-")[0];
  return (SUPPORTED as readonly string[]).includes(short) ? (short as Lang) : null;
};

// 💡 старт приложения
export const initI18n = async () => {
  try {
    const saved = norm(await AsyncStorage.getItem(KEY));
    const system = norm(Localization.getLocales()?.[0]?.languageCode);
    i18n.locale = saved ?? system ?? "en";
    console.log("Language set to:", i18n.locale);
  } catch (e) {
    console.warn("Error loading language:", e);
    i18n.locale = "en";
  }
};

// 🔁 вызов из Settings / меню
export const setLanguage = async (lang: string) => {
  const resolved = norm(lang) ?? "en";
  i18n.locale = resolved;
  await AsyncStorage.setItem(KEY, resolved);
  return resolved;
};

export default i18n;
