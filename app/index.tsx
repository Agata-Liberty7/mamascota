// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { clearActiveConversationData, clearConversationId } from "../utils/chatWithGPT";
import { handleActiveSessionDecision } from "../utils/handleActiveSessionDecision";
import { isPaid } from "../utils/access";
import LanguageNotice from "../components/ui/LanguageNotice";
import LanguageSelector from "../components/ui/LanguageSelector";
import { detectAndSetInitialLanguage } from "../utils/detectLanguage";
import i18n from '../i18n';
import { theme } from '../src/theme';
import { useDeviceClass } from '../hooks/useDeviceClass';



export default function StartScreen() {
  const router = useRouter();

  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const { isWeb, isDesktopLike, isTabletLike } = useDeviceClass();
  const heroWeb = require('../assets/images/Mamascota_2_web.png');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("selectedLanguage");
      if (!saved) {
        const lang = await detectAndSetInitialLanguage();
        setCurrentLanguage(lang);
        console.log("🌍 Автоязык установлен:", lang);
      } else {
        i18n.locale = saved;
        setCurrentLanguage(saved);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const [onboarding, accepted, legacy] = await Promise.all([
          AsyncStorage.getItem('seenOnboarding'),
          AsyncStorage.getItem('acceptedTerms'),
          AsyncStorage.getItem('termsAccepted'),
        ]);

        setOnboardingSeen(onboarding === 'true');
        setTermsAccepted(accepted === "true" || legacy === "true");

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
    const activeId = await AsyncStorage.getItem("conversationId");

    if (activeId) {
      await AsyncStorage.setItem("restoreFromSummary", "1");
      await AsyncStorage.setItem("decisionTreeStale", "1");

      router.replace("/chat");
      return;
    }

    await ensureEntryFlow();
  };

  const applyLanguage = async (lang: string) => {
    i18n.locale = lang;
    setCurrentLanguage(lang);
    await AsyncStorage.setItem("selectedLanguage", lang);
    setLanguageOpen(false);
  };

  const handleAboutPress = () => {
    router.push("/about?source=home" as Href);
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
      paddingTop: 4,
      pointerEvents: 'none',
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
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

    aboutLink: {
      fontSize: 14,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    supportButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    supportButtonDisabled: {

    },

    languageButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    languageButtonText: {
      fontSize: 22,
    },
    languagePanel: {
      position: 'absolute',
      top: 66,
      right: 18,
      zIndex: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: theme.radius.lg,
      padding: 12,
    },
    headerControls: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'absolute',
      top: 18,
      left: 0,
      right: 0,
      paddingHorizontal: 18,
      zIndex: 50,
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
      pointerEvents: 'none',
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
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

    aboutLink: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    supportButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    supportButtonDisabled: {
    },
    languageButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    languageButtonText: {
      fontSize: 22,
    },
    languagePanel: {
      position: 'absolute',
      top: 66,
      right: 18,
      zIndex: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: theme.radius.lg,
      padding: 12,
    },
    headerControls: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'absolute',
      top: 18,
      left: 0,
      right: 0,
      paddingHorizontal: 18,
      zIndex: 50,
    },
  });

  const styles = isWeb ? stylesWeb : stylesMobile;

  if (checking) return null;

  return (
    <>
      {/* 🔹 LanguageNotice показывается поверх всего интерфейса */}
      <LanguageNotice />

      <View style={styles.container}>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.supportButton, !termsAccepted && styles.supportButtonDisabled]}
          onPress={() => {
            if (!termsAccepted) return;
            router.push("/paywall" as Href);
          }}
          disabled={!termsAccepted}
          accessibilityLabel={String(i18n.t("menu.support_mamascota"))}
        >
          <MaterialIcons
            name="favorite"
            size={24}
            color={termsAccepted ? "#42A5F5" : "#9E9E9E"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguageOpen((v) => !v)}
          accessibilityLabel={String(i18n.t("menu.change_language"))}
        >
          <Text style={styles.languageButtonText}>🌐</Text>
        </TouchableOpacity>
      </View>

      {languageOpen && (
          <View style={styles.languagePanel}>
            <LanguageSelector
              selected={currentLanguage || i18n.locale}
              onSelect={applyLanguage}
              vertical
            />
          </View>
        )}

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

              <TouchableOpacity onPress={handleAboutPress}>
                <Text style={styles.aboutLink}>
                  {i18n.t("about.tagline")}
                </Text>
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

            <TouchableOpacity onPress={handleAboutPress}>
              <Text style={styles.aboutLink}>
                {i18n.t("about.tagline")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
