import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import i18n from "../i18n";
import { theme } from "../src/theme";
import MenuButton from "../components/ui/MenuButton";
import SupportHeartButton from "../components/ui/SupportHeartButton";
import TermsModal from "../components/TermsModal";


type FaqMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AboutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { langKey, source } = useLocalSearchParams();

  const normalizedLangKey = Array.isArray(langKey)
    ? langKey[0]
    : langKey ?? "default";

  const normalizedSource = Array.isArray(source) ? source[0] : source;
  const isPreTerms = normalizedSource === "home";
  const isFirstEntry = normalizedSource === "first_entry";
  const isOnboardingLocked = isPreTerms || isFirstEntry;

  useEffect(() => {
  navigation.setOptions({
    headerLeft: () => <SupportHeartButton disabled={isOnboardingLocked} />,
    headerRight: () => <MenuButton disabled={isOnboardingLocked} />,
  });
}, [navigation, isOnboardingLocked]);

  const isWeb = Platform.OS === "web";
  const styles = isWeb ? stylesWeb : stylesMobile;
  const [legalMode, setLegalMode] = useState<"terms" | "privacy" | null>(null);
  const [faqInput, setFaqInput] = useState("");
  const [faqMessages, setFaqMessages] = useState<FaqMessage[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const faqItems = [1, 2, 3, 4, 5, 6];

  const handleSuggestedFaq = (item: number) => {
    if (faqLoading) return;

    const question = String(i18n.t(`about.faq_${item}_q`)).trim();
    const answer = String(i18n.t(`about.faq_${item}_a`)).trim();

    if (!question || !answer) return;

    setFaqMessages([
      {
        role: "user",
        content: question,
      },
      {
        role: "assistant",
        content: answer,
      },
    ]);
    setFaqInput("");
  };

  const handleFaqSubmit = async (suggestedQuestion?: string) => {
    const question = String(suggestedQuestion ?? faqInput).trim();

    if (!question || faqLoading) return;

    const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;

    if (!proxyUrl) {
      return;
    }

    const nextUserMessage: FaqMessage = {
      role: "user",
      content: question,
    };

    const history = [...faqMessages, nextUserMessage];

    setFaqMessages(history);
    setFaqInput("");
    setFaqLoading(true);

    try {
      const localizedFaq = faqItems.map((item) => ({
        question: String(i18n.t(`about.faq_${item}_q`)),
        answer: String(i18n.t(`about.faq_${item}_a`)),
      }));

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "product_faq",
          message: question,
          userLang: i18n.locale,
          conversationId: "product-faq",
          conversationHistory: faqMessages.slice(-6),
          productFaqContext: localizedFaq,
        }),
      });

      const data = await response.json();

      if (
        !response.ok ||
        typeof data?.reply !== "string" ||
        !data.reply.trim()
      ) {
        return;
      }

      setFaqMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply.trim(),
        },
      ]);
    } catch {
      return;
    } finally {
      setFaqLoading(false);
    }
  };

  const handleInstagramPress = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  const handleWhatsappPress = () => {
    Linking.openURL("https://wa.me/+34666233341");
  };

  const handleLinkedInPress = () => {
    Linking.openURL("https://www.linkedin.com/in/irina-lukina-vet-digital");
  };

  const handleShowOnboarding = () => {
    router.push("/onboarding");
  };

  const handleBackToStart = () => {
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        key={normalizedLangKey}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroBlock}>
          <Image
            source={require("../assets/images/mamascota-logo-mark.png")}
            style={styles.logoMark}
            resizeMode="contain"
          />

          <Text style={styles.title}>{i18n.t("about.tagline")}</Text>

        </View>

        <View style={styles.faqAssistant}>
          {faqMessages.length === 0 && (
            <View style={styles.suggestionsWrap}>
              {faqItems.map((item) => {
                const question = i18n.t(`about.faq_${item}_q`);

                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionButton}
                    onPress={() => handleSuggestedFaq(item)}
                    disabled={faqLoading}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.suggestionText}>{question}</Text>

                    <Feather
                      name="arrow-up-right"
                      size={16}
                      color={theme.colors.buttonPrimaryBg}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {faqMessages.length > 0 && (
            <View style={styles.messagesWrap}>
              {faqMessages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  style={[
                    styles.messageBubble,
                    message.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === "user" &&
                        styles.userMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              ))}

              {faqLoading && (
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantMessage,
                    styles.loadingMessage,
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.buttonPrimaryBg}
                  />
                </View>
              )}
            </View>
          )}

          {faqMessages.length > 0 && (
            <TouchableOpacity
              style={styles.otherQuestionsButton}
              onPress={() => {
                setFaqMessages([]);
                setFaqInput("");
              }}
              disabled={faqLoading}
              activeOpacity={0.75}
            >
              <Feather
                name="arrow-left"
                size={16}
                color={theme.colors.buttonPrimaryBg}
              />

              <Text style={styles.otherQuestionsText}>
                {i18n.t("about.other_questions")}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={faqInput}
              onChangeText={setFaqInput}
              placeholder={i18n.t("about.still_have_questions")}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.faqInput}
              editable={!faqLoading}
              multiline
              textAlign="auto"
              onSubmitEditing={() => handleFaqSubmit()}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!faqInput.trim() || faqLoading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={() => handleFaqSubmit()}
              disabled={!faqInput.trim() || faqLoading}
              activeOpacity={0.75}
            >
              <Feather name="arrow-up" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {!isFirstEntry && (
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => setLegalMode("terms")}>
              <Text style={styles.legalLinkText}>
                {i18n.t("terms_title")}
              </Text>
            </TouchableOpacity>

            <Text style={styles.legalSeparator}>•</Text>

            <TouchableOpacity onPress={() => setLegalMode("privacy")}>
              <Text style={styles.legalLinkText}>
                {i18n.t("privacy_title")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isPreTerms ? (
        <>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBackToStart}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryButtonText}>
                {i18n.t("ok_button")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactsBlock}>
            <Text style={styles.questionFooter}>
              {i18n.t("about.still_have_questions")}
            </Text>

            <View style={styles.contactsRow}>
              <TouchableOpacity
                onPress={handleInstagramPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="instagram" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleWhatsappPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="message-circle" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLinkedInPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="linkedin" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>LinkedIn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
          <TouchableOpacity
            onPress={handleShowOnboarding}
            style={styles.secondaryButton}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryButtonText}>
              {isFirstEntry ? i18n.t("continue") : i18n.t("about.show_onboarding_again")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TermsModal
        visible={legalMode !== null}
        mode={legalMode ?? "terms"}
        onAccept={() => setLegalMode(null)}
        onDecline={() => setLegalMode(null)}
      />
    </View>
  );
}

const stylesMobile = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    alignItems: "center",
  },

  heroBlock: {
    width: "100%",
    maxWidth: 560,
    alignItems: "center",
    marginBottom: 22,
  },

  logoMark: {
    width: 58,
    height: 58,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },

  primaryInfo: {
    width: "100%",
    maxWidth: 560,
    marginBottom: 24,
  },

  primaryInfoItem: {
    paddingVertical: 16,
  },

  primaryInfoDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCE3E8",
  },

  primaryInfoTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },

  primaryInfoText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },

  faqWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: 8,
  },

  faqCard: {
    width: "100%",
    marginBottom: 7,
  },

  faqButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCE3E8",
    paddingHorizontal: 2,
    paddingVertical: 13,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
    color: theme.colors.textPrimary,
  },

  faqAnswer: {
    marginTop: 10,
    paddingHorizontal: 18,
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  faqAssistant: {
    width: "100%",
    maxWidth: 560,
    marginBottom: 18,
  },

  suggestionsWrap: {
    width: "100%",
    gap: 8,
    marginBottom: 14,
  },

  suggestionButton: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCE3E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  messagesWrap: {
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },

  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.buttonPrimaryBg,
    borderBottomRightRadius: 6,
  },

  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF3F6",
    borderBottomLeftRadius: 6,
  },

  loadingMessage: {
    minWidth: 52,
    alignItems: "center",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  otherQuestionsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 4,
  },

  otherQuestionsText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },

  inputRow: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C9D4DB",
    borderRadius: 18,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },

  faqInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    paddingTop: 9,
    paddingBottom: 8,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
  },

  sendButtonDisabled: {
    opacity: 0.38,
  },

  legalLinks: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    rowGap: 4,
    width: "100%",
  },
  legalSeparator: {
    display: "none",
  },

  legalLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
    textAlign: "center",
  },
  secondaryButton: {
    alignSelf: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  iconContainer: {
    marginTop: 12,
    alignSelf: "center",
    opacity: 0.9,
  },
  questionFooter: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  footerActions: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  contactsBlock: {
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },

  contactsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  contactIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  contactLink: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },
});

const stylesWeb = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
  },

  heroBlock: {
    width: "100%",
    maxWidth: 560,
    alignItems: "center",
    marginBottom: 26,
  },

  logoMark: {
    width: 66,
    height: 66,
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },

  primaryInfo: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    marginBottom: 28,
  },

  primaryInfoItem: {
    paddingVertical: 18,
  },

  primaryInfoDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCE3E8",
  },

  primaryInfoTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },

  primaryInfoText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },

  faqWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: 8,
  },

  faqCard: {
    width: "100%",
    marginBottom: 7,
  },

  faqButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCE3E8",
    paddingHorizontal: 2,
    paddingVertical: 13,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 21,
    color: theme.colors.textPrimary,
  },

  faqAnswer: {
    marginTop: 10,
    paddingHorizontal: 18,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  faqAssistant: {
    width: "100%",
    maxWidth: 620,
    marginBottom: 20,
  },

  suggestionsWrap: {
    width: "100%",
    gap: 8,
    marginBottom: 14,
  },

  suggestionButton: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCE3E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  messagesWrap: {
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },

  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.buttonPrimaryBg,
    borderBottomRightRadius: 6,
  },

  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF3F6",
    borderBottomLeftRadius: 6,
  },

  loadingMessage: {
    minWidth: 52,
    alignItems: "center",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  otherQuestionsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 4,
  },

  otherQuestionsText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },

  inputRow: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C9D4DB",
    borderRadius: 18,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },

  faqInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    paddingTop: 9,
    paddingBottom: 8,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    textAlign: "auto",
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
  },

  sendButtonDisabled: {
    opacity: 0.38,
  },

  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  legalSeparator: {
    marginHorizontal: 8,
    color: theme.colors.textSecondary,
  },

  legalLinkText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
    textAlign: "center",
  },
  
  secondaryButton: {
    alignSelf: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  iconContainer: {
    marginTop: 12,
    alignSelf: "center",
    opacity: 0.9,
  },
  questionFooter: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  footerActions: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  contactsBlock: {
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },

  contactsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  contactIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  contactLink: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },
});