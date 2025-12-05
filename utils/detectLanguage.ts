import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";

// поддерживаемые языки интерфейса
const SUPPORTED = ["en", "es", "ru", "he", "fr", "it", "de"];

export const detectAndSetInitialLanguage = async () => {
  // 1. пробуем взять язык из хранилища
  let lang = await AsyncStorage.getItem("selectedLanguage");

  // 2. если нет — определяем по системе
  if (!lang) {
    const systemLang = Localization.getLocales()[0]?.languageCode || "en";
    lang = SUPPORTED.includes(systemLang) ? systemLang : "en";

    await AsyncStorage.setItem("selectedLanguage", lang);

    // небольшой delay для Android, чтобы LanguageNotice успел смонтироваться
    await new Promise(r => setTimeout(r, 50));

  }

  // 3. применяем язык
  i18n.locale = lang;

  return lang;
};
