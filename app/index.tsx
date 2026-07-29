// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { clearActiveConversationData, clearConversationId } from "../utils/chatWithGPT";
import { handleActiveSessionDecision } from "../utils/handleActiveSessionDecision";
import { isPaid } from "../utils/access";
import LanguageNotice from "../components/ui/LanguageNotice";
import LanguageSelector from "../components/ui/LanguageSelector";
import PlanHeaderStatus from "../components/ui/PlanHeaderStatus";
import { detectAndSetInitialLanguage } from "../utils/detectLanguage";
import i18n from '../i18n';
import { theme } from '../src/theme';
import { useDeviceClass } from '../hooks/useDeviceClass';



export default function StartScreen() {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const { isWeb, isDesktopLike, isTabletLike } = useDeviceClass();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowWeb = isWeb && viewportWidth < 600;

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
        const [accepted, legacy] = await Promise.all([
          AsyncStorage.getItem('acceptedTerms'),
          AsyncStorage.getItem('termsAccepted'),
        ]);
        setTermsAccepted(accepted === "true" || legacy === "true");

        setChecking(false);
      };

      init();
    }, [])
  );

  // Входной поток: Условия → выбор животного
  const ensureEntryFlow = async () => {
    const [accepted, legacy] = await Promise.all([
      AsyncStorage.getItem("acceptedTerms"),
      AsyncStorage.getItem("termsAccepted"),
    ]);

    const termsOk = accepted === "true" || legacy === "true";

    if (!termsOk) {
      router.replace("/terms-screen");
      return;
    }

    router.replace("/animal-selection");
  };

  const handleStart = async (
    consultationMode: "normal" | "quickCheck"
  ) => {
    await AsyncStorage.setItem("consultationMode", consultationMode);

    if (consultationMode === "quickCheck") {
      await AsyncStorage.removeItem("quickCheckConversationId");
      await ensureEntryFlow();
      return;
    }

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
      flex: 1,
      width: '100%',
      alignItems: 'center',
    },
    topBlock: {
      width: '100%',
      maxWidth: 520,
      alignItems: 'center',
      paddingTop: 22,
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
      width: '76%',
      maxWidth: 320,
      height: undefined,
      aspectRatio: 0.95,
      marginTop: 24,
      marginBottom: 18,
    },
    brandRow: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoMark: {
      width: 72,
      height: 72,
      marginBottom: 0,
    },
    brandTextBlock: {
      alignItems: 'center',
    },
    title: {
      marginTop: 4,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    brandTagline: {
      maxWidth: 300,
      marginTop: 4,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    subtitle: {
      maxWidth: 360,
      marginTop: 42,
      fontSize: 16,
      lineHeight: 21,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    description: {
      maxWidth: 360,
      marginTop: 10,
      fontSize: 16,
      lineHeight: 21,
      textAlign: 'center',
      color: theme.colors.textSecondary,
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
    actionGroup: {
      width: "100%",
      maxWidth: 520,
      marginTop: 28,
      alignItems: "center",
    },
    primaryAction: {
      width: "100%",
      minHeight: 56,
      marginTop: 0,
      paddingHorizontal: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C8D1DA",
      borderRadius: 16,
      backgroundColor: "#FAFBFC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    primaryActionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    disclaimerWrap: {
      width: "100%",
      paddingHorizontal: 22,
      paddingBottom: 18,
      alignItems: "center",
    },
    disclaimerText: {
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },

    aboutLink: {
      fontSize: 14,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    supportButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    supportButtonDisabled: {

    },

    headerSide: {
      width: 42,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerSideRight: {
      justifyContent: 'flex-end',
    },
    aboutButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    languageButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
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
      justifyContent: 'flex-start',
      alignSelf: 'center',
    },
    mainStack: {
      width: '100%',
      maxWidth: 620,
      alignItems: 'center',
      marginTop: 80,
    },
    topBlock: {
      width: '100%',
      maxWidth: 620,
      alignItems: 'center',
      paddingTop: 34,
      pointerEvents: 'none',
    },
    heroBlock: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 26,
      marginBottom: 18,
    },
    bottomBlock: {
      width: '100%',
      alignItems: 'center',
      paddingBottom: 0,
      marginTop: 0,
    },
    brandRow: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoMark: {
      width: 68,
      height: 68,
      marginBottom: 0,
    },
    brandTextBlock: {
      alignItems: 'center',
    },
    title: {
      marginTop: 0,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    brandTagline: {
      maxWidth: 360,
      marginTop: 4,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    subtitle: {
      maxWidth: 520,
      marginTop: 48,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 0,
    },
    image: {
      width: '78%',
      maxWidth: 330,
      height: 330,
    },
    description: {
      maxWidth: 520,
      marginTop: 12,
      fontSize: 18,
      lineHeight: 23,
      textAlign: 'center',
      color: theme.colors.textSecondary,
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
    actionGroup: {
      width: "100%",
      maxWidth: 620,
      marginTop: 44,
      alignItems: "center",
    },
    primaryAction: {
      width: "100%",
      minHeight: 60,
      marginTop: 0,
      paddingHorizontal: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C8D1DA",
      borderRadius: 16,
      backgroundColor: "#FAFBFC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    primaryActionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    disclaimerWrap: {
      width: "100%",
      paddingHorizontal: 48,
      paddingBottom: 26,
      alignItems: "center",
    },
    disclaimerText: {
      maxWidth: 680,
      fontSize: 12,
      lineHeight: 17,
      textAlign: "center",
      color: theme.colors.textSecondary,
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    supportButtonDisabled: {
    },
    headerSide: {
      width: 42,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerSideRight: {
      justifyContent: 'flex-end',
    },
    aboutButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    languageButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
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

  const narrowWebStyles = StyleSheet.create({
    content: {
      justifyContent: "center",
      paddingTop: 0,
      paddingBottom: 44,
    },
    mainStack: {
      justifyContent: "flex-start",
      transform: [{ translateY: -64 }],
    },
    topBlock: {
      paddingTop: 0,
    },
    bottomBlock: {
      flex: 0,
      justifyContent: "flex-start",
      marginTop: 24,
      paddingBottom: 0,
    },
    actionGroup: {
      marginTop: 0,
    },
  });

  const startSubtitleText = String(i18n.t("start_subtitle"));
  const startSubtitleWords = startSubtitleText.trim().split(/\s+/);
  const startSubtitleDisplay =
    startSubtitleWords.length > 2
      ? `${startSubtitleWords.slice(0, -2).join(" ")} ${startSubtitleWords
          .slice(-2)
          .join("\u00A0")}`
      : startSubtitleText;

  if (checking) return null;

  return (
    <>
      {/* 🔹 LanguageNotice показывается поверх всего интерфейса */}
      <LanguageNotice />

      <View style={styles.container}>
        <View style={styles.headerControls}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              style={styles.aboutButton}
              onPress={handleAboutPress}
              accessibilityLabel={String(i18n.t("about.tagline"))}
            >
              <Feather
                name="info"
                size={21}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <PlanHeaderStatus />

          <View style={[styles.headerSide, styles.headerSideRight]}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLanguageOpen((v) => !v)}
              accessibilityLabel={String(i18n.t("menu.change_language"))}
            >
              <Feather
                name="globe"
                size={21}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
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
          <View
            style={[
              styles.content,
              isNarrowWeb && narrowWebStyles.content,
            ]}
          >
            <View
              style={[
                stylesWeb.mainStack,
                isNarrowWeb && narrowWebStyles.mainStack,
              ]}
            >
              <View
                style={[
                  styles.topBlock,
                  isNarrowWeb && narrowWebStyles.topBlock,
                ]}
              >
                <View style={styles.brandRow}>
                <Image
                  source={require("../assets/images/mamascota-logo-mark.png")}
                  style={styles.logoMark}
                  resizeMode="contain"
                />

                <View style={styles.brandTextBlock}>
                  <Text style={styles.title}>Mamascota</Text>
                  <Text style={styles.brandTagline}>
                    {i18n.t("brand_tagline")}
                  </Text>
                </View>
              </View>

              <Text style={styles.subtitle}>{startSubtitleDisplay}</Text>
              <Text style={styles.description}>
                {i18n.t("start_description")}
              </Text>
            </View>

            <View
              style={[
                styles.bottomBlock,
                isNarrowWeb && narrowWebStyles.bottomBlock,
              ]}
            >
              <View
                style={[
                  styles.actionGroup,
                  isNarrowWeb && narrowWebStyles.actionGroup,
                ]}
              >

                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => handleStart("normal")}
                >
                  <Text style={styles.primaryActionText}>
                    {i18n.t("full_consultation_button")}
                  </Text>

                  <MaterialIcons
                    name="arrow-forward"
                    size={22}
                    color={theme.colors.textPrimary}
                  />
                </TouchableOpacity>


              </View>
            </View>

            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.topBlock}>
              <View style={styles.brandRow}>
                <Image
                  source={require("../assets/images/mamascota-logo-mark.png")}
                  style={styles.logoMark}
                  resizeMode="contain"
                />

                <View style={styles.brandTextBlock}>
                  <Text style={styles.title}>Mamascota</Text>
                  <Text style={styles.brandTagline}>
                    {i18n.t("brand_tagline")}
                  </Text>
                </View>
              </View>

              <Text style={styles.subtitle}>{startSubtitleDisplay}</Text>
              <Text style={styles.description}>
                {i18n.t("start_description")}
              </Text>
            </View>

            <View style={styles.actionGroup}>

              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => handleStart("normal")}
              >
                <Text style={styles.primaryActionText}>
                  {i18n.t("full_consultation_button")}
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>


            </View>

          </View>
        )}

        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerText}>
            {i18n.t("free_page.benefits.no_diagnosis")}
          </Text>
        </View>
      </View>
    </>
  );
}
