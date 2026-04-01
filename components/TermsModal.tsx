// components/TermsModal.tsx
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from "react-native";
import i18n from "../i18n";
import { theme } from "../src/theme";

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({
  visible,
  onAccept,
  onDecline,
}: TermsModalProps) {
  const lang = (i18n.locale || "").split("-")[0];
  const isRTL = lang === "he";
  const isWeb = Platform.OS === "web";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isWeb && styles.containerWeb]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isWeb && styles.scrollContentWeb,
            ]}
            showsVerticalScrollIndicator
          >
            <Image
              source={require("../assets/images/Mamascota_5_1.png")}
              style={[styles.termsImage, isWeb && styles.termsImageWeb]}
              resizeMode="contain"
            />

            <Text style={styles.title}>{i18n.t("terms_title")}</Text>

            <Text style={[styles.paragraph, isRTL && styles.paragraphRTL]}>
              {i18n.t("terms_paragraph1")}
            </Text>

            <Text style={[styles.paragraph, isRTL && styles.paragraphRTL]}>
              {i18n.t("terms_paragraph2")}
            </Text>

            <Text style={[styles.paragraph, isRTL && styles.paragraphRTL]}>
              {i18n.t("terms_paragraph3")}
            </Text>

            <Text style={[styles.paragraph, isRTL && styles.paragraphRTL]}>
              {i18n.t("privacy_paragraph1")}
            </Text>

            <Text style={[styles.paragraph, isRTL && styles.paragraphRTL]}>
              {i18n.t("privacy_paragraph2")}
            </Text>
          </ScrollView>

          <View style={[styles.buttonsContainer, isWeb && styles.buttonsContainerWeb]}>
            <TouchableOpacity
              style={[styles.acceptButton, isWeb && styles.acceptButtonWeb]}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>{i18n.t("terms_accept")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineButton, isWeb && styles.declineButtonWeb]}
              onPress={onDecline}
            >
              <Text style={styles.declineText}>{i18n.t("terms_decline")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: 20,
  },
  containerWeb: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "86%",
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  scrollContentWeb: {
    paddingBottom: 8,
  },
  termsImage: {
    width: 160,
    height: 160,
    alignSelf: "center",
    marginBottom: 12,
  },
  termsImageWeb: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: theme.colors.textPrimary,
  },
  paragraph: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: "left",
    writingDirection: "ltr",
  },
  paragraphRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  buttonsContainer: {
    marginTop: 12,
  },
  buttonsContainerWeb: {
    marginTop: 16,
  },
  acceptButton: {
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonWeb: {
    minHeight: 46,
  },
  acceptText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  declineButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButtonWeb: {
    minHeight: 42,
  },
  declineText: {
    color: theme.colors.buttonPrimaryBg,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
