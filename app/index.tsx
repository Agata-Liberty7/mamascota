// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
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
import {
  getUiVariant,
  trackAnalyticsEvent,
  type UiVariant,
} from "../utils/analytics";



export default function StartScreen() {
  const router = useRouter();

  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [uiVariant, setUiVariant] = useState<UiVariant | null>(null);
  const { isWeb, isDesktopLike, isTabletLike } = useDeviceClass();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowWeb = isWeb && viewportWidth < 600;
  const heroWeb = require('../assets/images/Mamascota_2_web.png');
  const homeViewTrackedRef = useRef(false);

  useEffect(() => {
    setUiVariant(getUiVariant());
  }, []);

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

  useEffect(() => {
    if (checking || !currentLanguage || homeViewTrackedRef.current) {
      return;
    }

    homeViewTrackedRef.current = true;
    trackAnalyticsEvent("home_view", currentLanguage);
  }, [checking, currentLanguage]);

  const ensureEntryFlow = async () => {
    const [accepted, legacy, seenOnbRaw] = await Promise.all([
      AsyncStorage.getItem("acceptedTerms"),
      AsyncStorage.getItem("termsAccepted"),
      AsyncStorage.getItem("seenOnboarding"),
    ]);

    const termsOk = accepted === "true" || legacy === "true";
    const onboardingSeenFlag = seenOnbRaw === "true";

    if (!termsOk) {
      router.replace("/terms-screen");
      return;
    }

    if (uiVariant === "v2") {
      router.replace("/animal-selection");
      return;
    }

    if (!onboardingSeenFlag) {
      router.replace("/onboarding");
      return;
    }

    router.replace("/animal-selection");
  };

  const handleStart = async () => {
    const decision = await handleActiveSessionDecision();

    if (decision === "resume") {
      await AsyncStorage.setItem("restoreFromSummary", "1");
      await AsyncStorage.setItem("decisionTreeStale", "1");

      router.replace("/chat");
      return;
    }

    if (decision === "plus") {
      router.push("/plus");
      return;
    }

    if (decision === "cancel") {
      return;
    }

    if (decision === "start_new") {
      const activeId = await AsyncStorage.getItem("conversationId");
      const paid = await isPaid();

      if (activeId && !paid) {
        await clearActiveConversationData(activeId);
      }

      await clearConversationId();
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
    router.push(
      (termsAccepted ? "/about?source=home" : "/about?source=first_entry") as Href
    );
  };

  const handlePrimaryPress = async () => {
    trackAnalyticsEvent(
      "consultation_start_click",
      currentLanguage || i18n.locale,
      {
        entry_state: termsAccepted ? "ready" : "pre_terms",
      }
    );

    if (uiVariant === "v2" || termsAccepted) {
      await handleStart();
      return;
    }

    handleAboutPress();
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
      width: '76%',
      maxWidth: 320,
      height: undefined,
      aspectRatio: 0.95,
      marginTop: 24,
      marginBottom: 18,
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
      lineHeight: 22,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 14,
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
      justifyContent: 'flex-start',
      alignSelf: 'center',
    },
    topBlock: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 42,
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
      width: '78%',
      maxWidth: 330,
      height: 330,
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

  const stylesV2Mobile = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    content: {
      flex: 1,
      width: "100%",
      alignItems: "center",
    },
    topBlock: {
      width: "100%",
      maxWidth: 520,
      alignItems: "center",
      paddingTop: 22,
      pointerEvents: "none",
    },
    brandRow: {
      alignItems: "center",
      justifyContent: "center",
    },
    logoMark: {
      width: 72,
      height: 72,
      marginBottom: 0,
    },
    brandTextBlock: {
      alignItems: "center",
    },
    title: {
      marginTop: 4,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.colors.textPrimary,
    },
    brandTagline: {
      maxWidth: 300,
      marginTop: 4,
      fontSize: 14,
      lineHeight: 18,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    subtitle: {
      maxWidth: 360,
      marginTop: 42,
      fontSize: 16,
      lineHeight: 21,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    description: {
      maxWidth: 360,
      marginTop: 10,
      fontSize: 16,
      lineHeight: 21,
      textAlign: "center",
      color: theme.colors.textSecondary,
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
    headerSide: {
      width: 42,
      flexDirection: "row",
      alignItems: "center",
    },
    headerSideRight: {
      justifyContent: "flex-end",
    },
    aboutButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    languageButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    languagePanel: {
      position: "absolute",
      top: 66,
      right: 18,
      zIndex: 20,
      backgroundColor: "#FFFFFF",
      borderRadius: theme.radius.lg,
      padding: 12,
    },
    headerControls: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      position: "absolute",
      top: 18,
      left: 0,
      right: 0,
      paddingHorizontal: 18,
      zIndex: 50,
    },
  });

  const stylesV2Web = StyleSheet.create({
    ...stylesV2Mobile,
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
    },
    content: {
      flex: 1,
      width: "100%",
      maxWidth: 960,
      alignItems: "center",
      justifyContent: "flex-start",
      alignSelf: "center",
    },
    topBlock: {
      width: "100%",
      maxWidth: 620,
      alignItems: "center",
      paddingTop: 34,
      pointerEvents: "none",
    },
    logoMark: {
      width: 68,
      height: 68,
      marginBottom: 0,
    },
    title: {
      marginTop: 0,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.colors.textPrimary,
    },
    brandTagline: {
      maxWidth: 360,
      marginTop: 4,
      fontSize: 15,
      lineHeight: 20,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    subtitle: {
      maxWidth: 520,
      marginTop: 48,
      fontSize: 18,
      lineHeight: 24,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    description: {
      maxWidth: 520,
      marginTop: 12,
      fontSize: 18,
      lineHeight: 23,
      textAlign: "center",
      color: theme.colors.textSecondary,
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
      paddingHorizontal: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C8D1DA",
      borderRadius: 16,
      backgroundColor: "#FAFBFC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
  });

  const styles = isWeb ? stylesWeb : stylesMobile;

  if (checking || !uiVariant) return null;

  if (uiVariant === "v2") {
    const v2Styles = isWeb ? stylesV2Web : stylesV2Mobile;

    return (
      <>
        <LanguageNotice />

        <View style={v2Styles.container}>
          <View style={v2Styles.headerControls}>
            <View style={v2Styles.headerSide}>
              <TouchableOpacity
                style={v2Styles.aboutButton}
                onPress={() => router.push("/about?source=home" as Href)}
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

            <View style={[v2Styles.headerSide, v2Styles.headerSideRight]}>
              <TouchableOpacity
                style={v2Styles.languageButton}
                onPress={() => setLanguageOpen((value) => !value)}
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
            <View style={v2Styles.languagePanel}>
              <LanguageSelector
                selected={currentLanguage || i18n.locale}
                onSelect={applyLanguage}
                vertical
              />
            </View>
          )}

          <View style={v2Styles.content}>
            <View style={v2Styles.topBlock}>
              <View style={v2Styles.brandRow}>
                <Image
                  source={require("../assets/images/mamascota-logo-mark.png")}
                  style={v2Styles.logoMark}
                  resizeMode="contain"
                />

                <View style={v2Styles.brandTextBlock}>
                  <Text style={v2Styles.title}>Mamascota</Text>

                  <Text style={v2Styles.brandTagline}>
                    {String(i18n.t("brand_tagline"))}
                  </Text>
                </View>
              </View>

              <Text style={v2Styles.subtitle}>
                {String(i18n.t("start_subtitle"))}
              </Text>

              <Text style={v2Styles.description}>
                {String(i18n.t("start_description"))}
              </Text>
            </View>

            <View style={v2Styles.actionGroup}>
              <TouchableOpacity
                style={v2Styles.primaryAction}
                onPress={handlePrimaryPress}
              >
                <Text style={v2Styles.primaryActionText}>
                  {String(i18n.t("full_consultation_button"))}
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={v2Styles.disclaimerWrap}>
            <Text style={v2Styles.disclaimerText}>
              {String(i18n.t("free_page.benefits.no_diagnosis"))}
            </Text>
          </View>
        </View>
      </>
    );
  }

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

          <PlanHeaderStatus />

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
              <Text style={styles.subtitle}>{i18n.t("start_subtitle")}</Text>
            </View>

            <View style={styles.heroBlock}>
              <Image
                source={heroWeb}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            <View style={styles.bottomBlock}>
              <Text style={styles.description}>
                {i18n.t("start_description")}
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={handlePrimaryPress}
              >
                <Text style={styles.buttonText}>
                  {i18n.t("start_button")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.title}>Mamascota</Text>
            <Text style={styles.subtitle}>{i18n.t("start_subtitle")}</Text>

            <Image
              source={theme.images.start.hero}
              style={styles.image}
              resizeMode="contain"
            />

            <Text style={styles.description}>
              {i18n.t("start_description")}
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.buttonText}>
                {i18n.t("start_button")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
