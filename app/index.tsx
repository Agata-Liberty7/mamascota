// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState, useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clearConversationId } from "../utils/chatWithGPT";
import { handleActiveSessionDecision } from "../utils/handleActiveSessionDecision";
import LanguageNotice from "../components/ui/LanguageNotice";
import { detectAndSetInitialLanguage } from "../utils/detectLanguage";
import i18n from '../i18n';
import { theme } from '../src/theme';


export default function StartScreen() {
  const router = useRouter();

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
        const onboarding = await AsyncStorage.getItem('seenOnboarding');

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
    const decision = await handleActiveSessionDecision();

    if (decision === "resume") {
      // восстановление активной сессии = просто идём в чат
      await AsyncStorage.setItem("restoreFromSummary", "1");

      // помечаем decisionTree устаревшим
      await AsyncStorage.setItem("decisionTreeStale", "1");

      router.replace("/chat");
      return;
    }

    if (decision === "start_new") {
      // мягко начинаем новую: сбрасываем только активный conversationId
      await clearConversationId();
      console.log("🗑️ Активная сессия сброшена, начинаем заново.");
      await ensureEntryFlow();
      return;
    }

    if (decision === "no_active") {
      await ensureEntryFlow();
      return;
    }

    // cancel — ничего не делаем
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
