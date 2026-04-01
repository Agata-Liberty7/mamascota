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
import { useDeviceClass } from '../hooks/useDeviceClass';



export default function StartScreen() {
  const router = useRouter();

  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const { isWeb, isDesktopLike, isTabletLike } = useDeviceClass();
  const heroWeb = require('../assets/images/Mamascota_2_web.png');

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

  const stylesMobile = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    content: {
      width: '100%',
      alignItems: 'center',
    },
    topBlock: {
      width: '100%',
      alignItems: 'center',
    },
    heroBlock: {
      width: '100%',
      alignItems: 'center',
    },
    bottomBlock: {
      width: '100%',
      alignItems: 'center',
    },
    image: {
      width: '85%',
      height: undefined,
      aspectRatio: 0.95,
      marginVertical: 10,
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
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  const stylesWeb = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
    },
    content: {
      flex: 1,
      width: '100%',
      maxWidth: 960,
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf: 'center',
    },
    topBlock: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 4,
    },
    heroBlock: {
      width: '100%',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50%',
    },
    bottomBlock: {
      width: '100%',
      alignItems: 'center',
      paddingBottom: 16,
      marginTop: 16,
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 18,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 0,
    },
    image: {
      width: '80%',
      maxWidth: 400,
      height: undefined,
      aspectRatio: 0.95,
    },
    description: {
      fontSize: 18,
      lineHeight: 21,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 14,
      maxWidth: 360,
    },
    button: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      minHeight: 44,
      minWidth: 180,
      paddingVertical: 10,
      paddingHorizontal: 30,
      borderRadius: theme.radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });

  const styles = isWeb ? stylesWeb : stylesMobile;

  if (checking) return null;

  return (
    <>
      {/* 🔹 LanguageNotice показывается поверх всего интерфейса */}
      <LanguageNotice />

      <View style={styles.container}>
        {isWeb ? (
          <View style={styles.content}>
            <View style={styles.topBlock}>
              <Text style={styles.title}>Mamascota</Text>
              <Text style={styles.subtitle}>{i18n.t('start_subtitle')}</Text>
            </View>

            <View style={styles.heroBlock}>
              <Image
                source={heroWeb}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            <View style={styles.bottomBlock}>
              <Text style={styles.description}>{i18n.t('start_description')}</Text>

              <TouchableOpacity style={styles.button} onPress={handleStart}>
                <Text style={styles.buttonText}>{i18n.t('start_button')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
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
        )}
      </View>
    </>
  );
}
