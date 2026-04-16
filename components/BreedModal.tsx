//components/BreedModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import i18n from "../i18n";
import { BREEDS_BY_SPECIES } from "../utils/breeds";
import { theme } from "../src/theme";

export default function BreedModal({
  visible,
  species,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  species?: string | null;
  selected?: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  const breeds = species ? BREEDS_BY_SPECIES[species] || [] : [];

  return (
    <Modal transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {i18n.t("settings.pets.breed_label")}
          </Text>

          <ScrollView style={styles.list}>

            {/* BREEDS */}
            {breeds.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.item, selected === b && styles.itemActive]}
                onPress={() => onSelect(b)}
              >
                <Text style={styles.itemText}>{b}</Text>
              </TouchableOpacity>
            ))}

            {/* "Другое" — внизу списка */}
            <TouchableOpacity
              style={[
                styles.item,
                selected === "__other" && styles.itemActive,
              ]}
              onPress={() => onSelect("__other")}
            >
              <Text style={styles.itemText}>{i18n.t("animal_other")}</Text>
            </TouchableOpacity>

          </ScrollView>


          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>
            {i18n.t("close", { defaultValue: "Close" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  list: {
    marginBottom: 20,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  itemActive: {
    backgroundColor: "#eef5ff",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
  closeBtn: {
    marginTop: 10,
    alignSelf: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
});
