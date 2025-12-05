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
} from "react-native";
import i18n from "../i18n";

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{i18n.t("terms_title")}</Text>
            
            {/* 🐹 иллюстрация над заголовком */}
            <Image
              source={require("../assets/images/Mamascota_5_1.png")}
              style={styles.termsImage}
              resizeMode="contain"
            />



            <Text style={styles.paragraph}>
              {i18n.t("terms_paragraph1")}
            </Text>
            <Text style={styles.paragraph}>
              {i18n.t("terms_paragraph2")}
            </Text>
            <Text style={styles.paragraph}>
              {i18n.t("terms_paragraph3")}
            </Text>
            <Text style={styles.paragraph}>
              {i18n.t("privacy_paragraph1")}
            </Text>
            <Text style={styles.paragraph}>
              {i18n.t("privacy_paragraph2")}
            </Text>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                <Text style={styles.acceptText}>
                  {i18n.t("terms_accept")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.declineButton}
                onPress={onDecline}
              >
                <Text style={styles.declineText}>
                  {i18n.t("terms_decline")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
    width: "90%",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  termsImage: {
    width: 160,
    height: 160,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
    marginBottom: 10,
    textAlign: "left",
  },
  buttonsContainer: {
    marginTop: 20,
  },
  acceptButton: {
    backgroundColor: "#42A5F5",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  acceptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  declineButton: {
    paddingVertical: 12,
  },
  declineText: {
    color: "#42A5F5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
