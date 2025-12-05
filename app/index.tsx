// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useEffect } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../i18n';
import { theme } from '../src/theme';
import { restoreSession, clearConversationId } from "../utils/chatWithGPT";
import LanguageNotice from "../components/ui/LanguageNotice";
import { detectAndSetInitialLanguage } from "../utils/detectLanguage";


export default function StartScreen() {
  const router = useRouter();

  const [sessionSaved, setSessionSaved] = useState<boolean>(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("selectedLanguage");
      if (!saved) {
        const lang = await detectAndSetInitialLanguage();
        console.log("🌍 Автоязык установлен:", lang);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const session = await AsyncStorage.getItem('sessionSaved');
        const onboarding = await AsyncStorage.getItem('seenOnboarding');

        setSessionSaved(session === 'true');
        setOnboardingSeen(onboarding === 'true');

        setChecking(false);
      };

      init();
    }, [])
  );

  // 🔗 Каноничный входной поток: Условия → Онбординг → Мои питомцы
  const ensureEntryFlow = async () => {
    const [accepted, legacy, seenOnbRaw] = await Promise.all([
      AsyncStorage.getItem("acceptedTerms"),
      AsyncStorage.getItem("termsAccepted"),
      AsyncStorage.getItem("seenOnboarding"),
    ]);

    const termsOk = accepted === "true" || legacy === "true";
    const onboardingSeenFlag = seenOnbRaw === "true";

    if (!termsOk) {
      // 1️⃣ ещё не принял Условия → сначала экран условий
      router.replace("/terms-screen");
    } else if (!onboardingSeenFlag) {
      // 2️⃣ Условия приняты, но онбординг ещё не пройден → онбординг
      router.replace("/onboarding");
    } else {
      // 3️⃣ и Условия, и онбординг уже были → сразу к выбору питомца
      router.replace("/animal-selection");
    }
  };

  const handleStart = async () => {
    const existingId = await AsyncStorage.getItem("conversationId");

    if (existingId) {
      // 🔁 Логика продолжения / новой сессии
      Alert.alert(
        i18n.t("continue_title"),
        i18n.t("continue_message"),
        [
          {
            text: i18n.t("start_new"),
            style: "destructive",
            onPress: async () => {
              await clearConversationId();
              console.log("🗑️ Старая сессия очищена, начинаем заново.");
              await ensureEntryFlow();
            },
          },
          {
            text: i18n.t("continue_session"),
            onPress: async () => {
              await restoreSession(existingId);
              console.log("♻️ Восстановлена сохранённая сессия:", existingId);

              const summaryRaw = await AsyncStorage.getItem("chatSummary");
              const summaryList = summaryRaw ? JSON.parse(summaryRaw) : [];

              if (summaryList.length > 1) {
                console.log("📜 Несколько сохранённых сессий → переход в Summary");
                router.replace("/summary");
              } else {
                console.log("💬 Одна активная сессия → переход в чат");
                router.replace("/chat");
              }
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // 🧠 Новый пользователь или все сессии очищены → идём по каноничному потоку
      await ensureEntryFlow();
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    image: {
      width: '95%',     // тянемся по ширине экрана
      height: undefined,
      aspectRatio: 0.95,   // квадрат, сохраняет пропорции
      marginVertical: 10,
      // maxWidth: 480,  // (необязательно) ограничитель на больших экранах
    },
    title: {
      fontSize: 34,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 18,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    description: {
      fontSize: 18,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    button: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: theme.radius.xl,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    buttonText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    // ⬇️ добавили только это
    langWrapper: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(1),
    },
  });

  if (checking) return null;

  return (
    <>
      {/* 🔹 LanguageNotice показывается поверх всего интерфейса */}
      <LanguageNotice />

      <View style={styles.container}>
        <Text style={styles.title}>Mamascota</Text>
        <Text style={styles.subtitle}>{i18n.t('start_subtitle')}</Text>

        <Image
          source={theme.images.start.hero}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.description}>{i18n.t('start_description')}</Text>

        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>{i18n.t('start_button')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
